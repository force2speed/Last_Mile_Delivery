// =============================================================================
// controllers/order.controller.ts — Order CRUD + Critical Status Update
// =============================================================================
//
// The updateStatus() method is the most safety-critical endpoint in the system.
// It orchestrates the following pipeline on EVERY call:
//
//   [1] Fetch order (existence + optimistic lock check)
//   [2] StateMachine.validate(from, to, actor) — throws on illegal transition
//   [3] Build tracking event data (GPS, notes, actor)
//   [4] Execute Prisma transaction:
//         a. Update Order.status (+ deliveredAt if DELIVERED)
//         b. INSERT TrackingEvent (immutable append)
//         c. If FAILED: free agent, call AgentAssignmentService.handleFailedDelivery()
//   [5] Post-transaction: fire notifications (email + SMS) — non-blocking
//   [6] Return updated order with latest tracking event
// =============================================================================

import { Request, Response } from "express";
import { PrismaClient, OrderStatus, Role, AgentStatus } from "@prisma/client";
import { StateMachine, StatusTransitionError, Actor } from "../config/state-machine";
import { AgentAssignmentService } from "../services/agent-assignment.service";
import { RateCalculationService } from "../services/rate-calculation.service";
import { notificationService } from "../services/notification.service";

const prisma = new PrismaClient();
const assignmentService = new AgentAssignmentService(prisma);
const rateService       = new RateCalculationService(prisma);

// ── Validation helpers ────────────────────────────────────────────────────────

function resolveActor(role: Role): Actor {
  // Map JWT role to state machine actor type
  return role as Actor;
}

// ── Controller ────────────────────────────────────────────────────────────────

export class OrderController {

  // ===========================================================================
  // POST /rate/calculate — Preview rate without creating an order
  // ===========================================================================
  static async calculateRate(req: Request, res: Response) {
    try {
      const {
        pickupAreaId, dropAreaId,
        lengthCm, breadthCm, heightCm, actualWeightKg,
        businessType, paymentType, codCollectAmount,
      } = req.body;

      if (lengthCm > 5000 || breadthCm > 5000 || heightCm > 5000 || actualWeightKg > 10000) {
        return res.status(400).json({ error: "Package dimensions or weight exceed maximum allowed limits for delivery." });
      }

      const pricing = await rateService.calculate({
        pickupAreaId, dropAreaId,
        lengthCm, breadthCm, heightCm, actualWeightKg,
        businessType, paymentType,
        codCollectAmount: codCollectAmount ?? 0,
      });

      return res.status(200).json(pricing);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  // ===========================================================================
  // POST /orders — Create a new order
  // ===========================================================================
  static async createOrder(req: Request, res: Response) {
    try {
      const {
        pickupAreaId, dropAreaId,
        lengthCm, breadthCm, heightCm, actualWeightKg,
        businessType, paymentType, codCollectAmount,
        pickupAddressData, dropAddressData,
      } = req.body;

      if (lengthCm > 5000 || breadthCm > 5000 || heightCm > 5000 || actualWeightKg > 10000) {
        return res.status(400).json({ error: "Package dimensions or weight exceed maximum allowed limits for delivery." });
      }

      const customerId = req.user!.userId;

      // [1] Run rate calculation engine
      const pricing = await rateService.calculate({
        pickupAreaId, dropAreaId,
        lengthCm, breadthCm, heightCm, actualWeightKg,
        businessType, paymentType,
        codCollectAmount: codCollectAmount ?? 0,
      });

      // [2] Persist pickup and drop addresses
      const [pickupAddr, dropAddr] = await Promise.all([
        prisma.address.create({
          data: { ...pickupAddressData, areaId: pickupAreaId },
        }),
        prisma.address.create({
          data: { ...dropAddressData, areaId: dropAreaId },
        }),
      ]);

      // [3] Create order with full pricing snapshot
      const order = await prisma.order.create({
        data: {
          customerId,
          pickupAddressId:     pickupAddr.id,
          dropAddressId:       dropAddr.id,
          pickupZoneId:        pricing.pickupZoneId,
          dropZoneId:          pricing.dropZoneId,
          routeType:           pricing.routeType,
          lengthCm,   breadthCm,   heightCm,
          actualWeightKg:      pricing.weights.actualWeightKg,
          volumetricWeightKg:  pricing.weights.volumetricWeightKg,
          billableWeightKg:    pricing.weights.billableWeightKg,
          businessType,        paymentType,
          rateCardId:          pricing.rateCardId,
          baseCharge:          pricing.baseCharge,
          weightCharge:        pricing.weightCharge,
          codSurcharge:        pricing.codSurcharge,
          totalCharge:         pricing.totalCharge,
          codCollectAmount:    codCollectAmount ?? null,
        },
      });

      // [4] Seed initial CREATED tracking event
      await prisma.trackingEvent.create({
        data: {
          orderId:     order.id,
          status:      OrderStatus.CREATED,
          actorId:     customerId,
          eventSource: "CUSTOMER_PORTAL",
          notes:       "Order placed.",
        },
      });

      // [5] Trigger auto-assignment asynchronously (non-blocking)
      assignmentService
        .assignAgent(
          order.id,
          pricing.pickupZoneId,
          pickupAddressData.latitude ?? null,
          pickupAddressData.longitude ?? null
        )
        .catch((err) =>
          console.error(`[AutoAssign] Failed for order ${order.id}:`, err)
        );

      return res.status(201).json({
        message: "Order created successfully.",
        order: { ...order, pricingBreakdown: pricing },
      });
    } catch (err: any) {
      console.error("[OrderController.createOrder]", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ===========================================================================
  // PATCH /orders/:orderId/status — Update Order Status (CRITICAL ENDPOINT)
  // ===========================================================================
  //
  // This is the most safety-critical endpoint. Every delivery lifecycle event
  // flows through here. Full pipeline documented at top of file.
  // ===========================================================================
  static async updateStatus(req: Request, res: Response) {
    const { orderId } = req.params;
    const { status: requestedStatus, notes, latitude, longitude } = req.body;
    const actorUser = req.user!;

    // ── [1] Validate incoming status value ────────────────────────────────────
    if (!Object.values(OrderStatus).includes(requestedStatus)) {
      return res.status(400).json({
        error: `"${requestedStatus}" is not a valid order status.`,
        validStatuses: Object.values(OrderStatus),
      });
    }

    try {
      // ── [2] Fetch current order ───────────────────────────────────────────
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: { select: { fullName: true, email: true, phone: true } },
          agent:    { select: { fullName: true, phone: true, id: true } },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found." });
      }

      // ── [3] State Machine Validation ──────────────────────────────────────
      //
      // This is the enforcement layer. StateMachine.validate() throws
      // StatusTransitionError with HTTP status 422 or 403 on any violation.
      //
      // Examples of blocked transitions:
      //   PICKED_UP     → DELIVERED        (skips IN_TRANSIT, OUT_FOR_DELIVERY)
      //   OUT_FOR_DELIVERY → PICKUP_SCHEDULED (backwards move)
      //   DELIVERED     → anything          (terminal state)
      //   CUSTOMER role → PICKED_UP         (only agents/admins can do this)
      const actor = resolveActor(actorUser.role);
      StateMachine.validate(order.status, requestedStatus as OrderStatus, actor);

      // ── [4] Build tracking event payload ──────────────────────────────────
      const trackingEventData = {
        orderId,
        status:      requestedStatus as OrderStatus,
        actorId:     actorUser.userId,
        eventSource: actorUser.role === Role.ADMIN ? "ADMIN_PORTAL" :
                     actorUser.role === Role.DELIVERY_AGENT ? "AGENT_APP" :
                     "CUSTOMER_PORTAL",
        notes:       notes ?? null,
        latitude:    latitude   ? parseFloat(latitude)   : null,
        longitude:   longitude  ? parseFloat(longitude)  : null,
      };

      // ── [5] Execute atomic transaction ────────────────────────────────────
      //
      // Everything below is a single DB transaction. If any step fails,
      // the entire write rolls back — the order status remains unchanged.

      let rescheduledOrderId: string | undefined;
      let isEscalated = false;

      await prisma.$transaction(async (tx) => {
        // 5a. Build order update payload
        const orderUpdate: Record<string, unknown> = {
          status: requestedStatus,
        };

        // Set deliveredAt timestamp on successful delivery
        if (requestedStatus === OrderStatus.DELIVERED) {
          orderUpdate.deliveredAt = new Date();
        }

        // On FAILED: free the agent
        if (requestedStatus === OrderStatus.FAILED) {
          if (order.agent) {
            await tx.agentProfile.updateMany({
              where: { userId: order.agent.id },
              data:  { status: AgentStatus.AVAILABLE },
            });
          }
          orderUpdate.failureReason    = notes ?? "Reason not provided";
          orderUpdate.failedAttempts   = { increment: 1 };
          orderUpdate.agentId          = null; // Unassign agent
        }

        // 5b. Update order status
        await tx.order.update({
          where: { id: orderId },
          data:  orderUpdate,
        });

        // 5c. Append immutable tracking event (NEVER update, only insert)
        await tx.trackingEvent.create({ data: trackingEventData });
      });

      // ── [6] Post-transaction side effects (non-blocking) ──────────────────
      //
      // These run OUTSIDE the transaction intentionally:
      //   - Notification failures must NOT roll back the status change
      //   - Rescheduling is a separate service call (has its own transaction)

      if (requestedStatus === OrderStatus.FAILED) {
        // Re-fetch updated failedAttempts after transaction
        const updatedOrder = await prisma.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { failedAttempts: true, maxAttempts: true },
        });

        // Trigger rescheduling flow
        const rescheduleResult = await assignmentService.handleFailedDelivery(
          orderId,
          notes ?? "Reason not provided",
          actorUser.userId
        );
        rescheduledOrderId = rescheduleResult.rescheduledOrderId;
        isEscalated        = rescheduleResult.escalated;

        // Fire failure notification (non-blocking)
        notificationService
          .notifyDeliveryFailed({
            customerName:     order.customer.fullName,
            customerEmail:    order.customer.email,
            customerPhone:    order.customer.phone,
            orderNumber:      order.orderNumber,
            failureReason:    notes ?? "Delivery attempt unsuccessful",
            newAttemptNumber: updatedOrder.failedAttempts,
            maxAttempts:      updatedOrder.maxAttempts,
            isEscalated,
          })
          .catch((err) => console.error("[Notify] Failed delivery notification error:", err));
      }

      if (requestedStatus === OrderStatus.DELIVERED) {
        notificationService
          .notifyDeliverySuccess({
            customerName:  order.customer.fullName,
            customerEmail: order.customer.email,
            customerPhone: order.customer.phone,
            orderNumber:   order.orderNumber,
            deliveredAt:   new Date(),
          })
          .catch((err) => console.error("[Notify] Delivery success notification error:", err));
      }

      // ── [7] Return response ───────────────────────────────────────────────
      return res.status(200).json({
        message:            `Order status updated to "${requestedStatus}".`,
        orderId,
        previousStatus:     order.status,
        currentStatus:      requestedStatus,
        rescheduledOrderId: rescheduledOrderId ?? null,
        escalated:          isEscalated,
        trackingEvent:      trackingEventData,
      });

    } catch (err: any) {
      if (err instanceof StatusTransitionError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error("[OrderController.updateStatus]", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // ===========================================================================
  // GET /orders/:orderId — Get order with full tracking history
  // ===========================================================================
  static async getOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const user = req.user!;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer:     { select: { fullName: true, email: true, phone: true } },
          agent:        { select: { fullName: true, phone: true } },
          pickupAddress:{ include: { area: { include: { zone: true } } } },
          dropAddress:  { include: { area: { include: { zone: true } } } },
          rateCard:     { select: { name: true, version: true, businessType: true } },
          trackingHistory: {
            orderBy: { occurredAt: "asc" },
            include: { actor: { select: { fullName: true, role: true } } },
          },
          reschedules: {
            select: { id: true, orderNumber: true, status: true, createdAt: true },
          },
        },
      });

      if (!order) return res.status(404).json({ error: "Order not found." });

      // Customers can only view their own orders
      if (user.role === Role.CUSTOMER && order.customerId !== user.userId) {
        return res.status(403).json({ error: "Access denied." });
      }

      // Compute next valid states for the UI (for action buttons)
      const nextStates = StateMachine.nextStates(order.status, resolveActor(user.role));

      return res.status(200).json({ ...order, nextStates });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ===========================================================================
  // GET /orders — List orders (role-filtered)
  // ===========================================================================
  static async listOrders(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { status, page = "1", limit = "20" } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      // Build where clause based on role
      const where: Record<string, unknown> = {};
      if (user.role === Role.CUSTOMER)       where.customerId = user.userId;
      if (user.role === Role.DELIVERY_AGENT) where.agentId    = user.userId;
      if (status) where.status = status;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take,
          orderBy:  { createdAt: "desc" },
          select: {
            id: true, orderNumber: true, status: true,
            totalCharge: true, paymentType: true, createdAt: true,
            customer: { select: { fullName: true } },
            agent:    { select: { fullName: true } },
            dropAddress: { select: { city: true, state: true } },
          },
        }),
        prisma.order.count({ where }),
      ]);

      return res.status(200).json({
        data: orders,
        meta: { total, page: parseInt(page as string), limit: take, pages: Math.ceil(total / take) },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
