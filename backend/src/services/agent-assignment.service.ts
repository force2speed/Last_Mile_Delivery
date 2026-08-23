// =============================================================================
// services/agent-assignment.service.ts
// =============================================================================
//
// RESPONSIBILITY:
//   Given an order's pickup location, this service selects the single best
//   available delivery agent using a multi-factor scoring algorithm.
//
// SCORING MODEL (lower score = better):
//   finalScore = distanceScore + workloadScore + zoneBonus
//
//   distanceScore  = normalized [0-50] based on GPS proximity
//   workloadScore  = normalized [0-40] based on active order count
//   zoneBonus      = -10 if same zone (reward agents in the pickup zone)
//
// FALLBACK TIERS (tried in order):
//   Tier 1: SAME_ZONE    — agents with currentZoneId == pickupZoneId
//   Tier 2: ADJACENT_ZONE — reserved for future zone-adjacency table
//   Tier 3: ANY_ZONE     — any AVAILABLE agent in the system
//   Tier 4: QUEUED       — no agent found; order enters retry queue
//
// WORKLOAD METRIC (Anti-hotspot design):
//   activeOrders = count of orders assigned to agent with status in
//   {PICKUP_SCHEDULED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY}
//   Agents near their maxWorkload threshold are deprioritized.
//
// =============================================================================

import {
  PrismaClient,
  AgentStatus,
  OrderStatus,
} from "@prisma/client";
import { haversineDistanceKm, roundTo } from "../utils/geo.utils";
import { AgentScore, AssignmentResult } from "../types/order.types";
import { notificationService } from "./notification.service";

// Maximum active orders before an agent is considered "overloaded"
const MAX_AGENT_WORKLOAD = 8;

// If no agent is within this distance (km), tier-2 fallback kicks in
const SAME_ZONE_DISTANCE_THRESHOLD_KM = 15;

// Active statuses — orders in these states count toward workload
const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PICKUP_SCHEDULED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
];

export class AgentAssignmentService {
  constructor(private readonly prisma: PrismaClient) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Main assignment entry point.
   *
   * @param orderId         The order to assign
   * @param pickupZoneId    Zone of the pickup address (denorm field on Order)
   * @param pickupLatitude  Pickup address GPS lat (for precise distance calc)
   * @param pickupLongitude Pickup address GPS lng
   */
  async assignAgent(
    orderId: string,
    pickupZoneId: string,
    pickupLatitude: number | null,
    pickupLongitude: number | null
  ): Promise<AssignmentResult> {

    // ── Tier 1: Same-zone agents ───────────────────────────────────────────
    const sameZoneResult = await this.tryAssign(
      orderId,
      pickupZoneId,
      pickupLatitude,
      pickupLongitude,
      "SAME_ZONE"
    );
    if (sameZoneResult.success) return sameZoneResult;

    // ── Tier 2: Any available agent (system-wide fallback) ─────────────────
    // NOTE: A future enhancement can add a zone_adjacency table and insert
    //       a true "Tier 2 adjacent zone" lookup here before going system-wide.
    const anyZoneResult = await this.tryAssign(
      orderId,
      null,            // null = no zone filter
      pickupLatitude,
      pickupLongitude,
      "ANY_ZONE"
    );
    if (anyZoneResult.success) return anyZoneResult;

    // ── Tier 3: Queue for retry ────────────────────────────────────────────
    await this.queueForRetry(orderId);
    return {
      success: false,
      queuedForRetry: true,
      reason: "No available agents found. Order queued for retry in 5 minutes.",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE: CANDIDATE FETCH + SCORING + COMMIT
  // ═══════════════════════════════════════════════════════════════════════════

  private async tryAssign(
    orderId: string,
    zoneId: string | null,
    pickupLat: number | null,
    pickupLng: number | null,
    tier: AssignmentResult["fallbackTier"]
  ): Promise<AssignmentResult> {

    // ── 1. Fetch candidate agents ──────────────────────────────────────────
    const candidates = await this.fetchCandidateAgents(zoneId);
    if (candidates.length === 0) {
      return { success: false, fallbackTier: tier };
    }

    // ── 2. Compute active workload for each candidate ──────────────────────
    const workloads = await this.fetchWorkloads(
      candidates.map((c) => c.userId)
    );

    // ── 3. Score every candidate ───────────────────────────────────────────
    const scored: AgentScore[] = candidates
      .map((agent) => {
        const activeOrders = workloads.get(agent.userId) ?? 0;

        // Reject agents who have hit the workload ceiling
        if (activeOrders >= MAX_AGENT_WORKLOAD) return null;

        return this.scoreAgent(
          agent,
          activeOrders,
          pickupLat,
          pickupLng,
          zoneId,
          tier
        );
      })
      .filter((s): s is AgentScore => s !== null);

    if (scored.length === 0) {
      return { success: false, fallbackTier: tier };
    }

    // ── 4. Pick the best (lowest finalScore) ──────────────────────────────
    scored.sort((a, b) => a.finalScore - b.finalScore);
    const best = scored[0];

    // ── 5. Commit assignment in a transaction ──────────────────────────────
    const commitData = await this.commitAssignment(orderId, best.agentId, best.userId);

    // ── 6. Trigger notification ────────────────────────────────────────────
    notificationService.notifyAgentAssigned({
      customerName: commitData.customerName,
      customerEmail: commitData.customerEmail,
      customerPhone: commitData.customerPhone,
      orderNumber: commitData.orderNumber,
      agentName: commitData.agentName,
      agentPhone: commitData.agentPhone,
    }).catch(err => console.error(`[AutoAssign] Failed to notify agent assignment for order ${orderId}:`, err));

    return {
      success: true,
      agentId: best.agentId,
      agentUserId: best.userId,
      score: best,
      fallbackTier: tier,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — CANDIDATE FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches AVAILABLE agents, optionally filtered by zone.
   *
   * AGENT AVAILABILITY MODEL:
   *   An agent is a candidate iff ALL of:
   *     ✓ AgentProfile.status = AVAILABLE  (not Busy or Offline)
   *     ✓ User.isActive = true             (account not suspended)
   *     ✓ Has GPS coordinates              (needed for distance calc)
   *     ✓ (If zoneId given) currentZoneId matches pickup zone
   *
   * GPS requirement: if an agent hasn't pinged their location in the last
   * 30 minutes, they are excluded from GPS-based scoring but can still
   * appear in zone-only matching (see locationIsStale guard below).
   */
  private async fetchCandidateAgents(zoneId: string | null) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    return this.prisma.agentProfile.findMany({
      where: {
        status: AgentStatus.AVAILABLE,
        user: { isActive: true },
        ...(zoneId ? { currentZoneId: zoneId } : {}),
        // Only include agents with a fresh GPS ping
        lastLocationAt: { gte: thirtyMinutesAgo },
      },
      select: {
        id: true,          // AgentProfile.id
        userId: true,
        currentLatitude: true,
        currentLongitude: true,
        currentZoneId: true,
        lastLocationAt: true,
        vehicleType: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — WORKLOAD FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches the active order count for each candidate agent.
   *
   * WORKLOAD METRIC (Anti-hotspot / load balancing):
   *   activeOrders = number of non-terminal orders assigned to the agent.
   *
   *   This prevents the system from routing all new orders to the closest
   *   single agent, which would:
   *     - Create SLA risk (one agent overwhelmed)
   *     - Increase re-delivery costs on failures
   *     - Create unfair compensation for other agents
   *
   *   We use a single GROUP BY query instead of N+1 individual counts.
   */
  private async fetchWorkloads(
    userIds: string[]
  ): Promise<Map<string, number>> {
    const counts = await this.prisma.order.groupBy({
      by: ["agentId"],
      where: {
        agentId: { in: userIds },
        status: { in: ACTIVE_STATUSES },
      },
      _count: { agentId: true },
    });

    const map = new Map<string, number>();
    for (const row of counts) {
      if (row.agentId) map.set(row.agentId, row._count.agentId);
    }
    return map;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — MULTI-FACTOR SCORING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Scores a single agent candidate. Lower score = better assignment choice.
   *
   * SCORING BREAKDOWN:
   *
   *   distanceScore [0–50]
   *     Normalized: (distanceKm / MAX_MEANINGFUL_DISTANCE) * 50
   *     MAX_MEANINGFUL_DISTANCE = 20km (anything beyond is capped at 50pts)
   *     Agents without GPS skip this component (penalized with 25pts).
   *
   *   workloadScore [0–40]
   *     Normalized: (activeOrders / MAX_AGENT_WORKLOAD) * 40
   *     Agent at 0 orders → 0pts. Agent at 7/8 capacity → 35pts.
   *     Agents AT max (8) are excluded before scoring.
   *
   *   zoneBonus [-10]
   *     If the agent is in the same zone as the pickup: subtract 10pts.
   *     Rewards agents who are already operating in the right zone.
   *
   *   finalScore = distanceScore + workloadScore + zoneBonus
   *   Range: [-10, 90]
   */
  private scoreAgent(
    agent: Awaited<ReturnType<typeof this.fetchCandidateAgents>>[number],
    activeOrders: number,
    pickupLat: number | null,
    pickupLng: number | null,
    pickupZoneId: string | null,
    tier: AssignmentResult["fallbackTier"]
  ): AgentScore {
    const MAX_MEANINGFUL_DISTANCE_KM = 20;

    // ── Distance score ─────────────────────────────────────────────────────
    let distanceKm = Infinity;
    let distanceScore = 25; // default penalty if no GPS

    const agentLat = agent.currentLatitude
      ? parseFloat(String(agent.currentLatitude))
      : null;
    const agentLng = agent.currentLongitude
      ? parseFloat(String(agent.currentLongitude))
      : null;

    if (agentLat !== null && agentLng !== null && pickupLat !== null && pickupLng !== null) {
      distanceKm = haversineDistanceKm(pickupLat, pickupLng, agentLat, agentLng);
      distanceScore = roundTo(
        Math.min(distanceKm / MAX_MEANINGFUL_DISTANCE_KM, 1) * 50,
        2
      );
    }

    // ── Workload score ─────────────────────────────────────────────────────
    const workloadScore = roundTo(
      (activeOrders / MAX_AGENT_WORKLOAD) * 40,
      2
    );

    // ── Zone bonus ─────────────────────────────────────────────────────────
    const zoneBonus =
      pickupZoneId && agent.currentZoneId === pickupZoneId ? -10 : 0;

    const finalScore = roundTo(distanceScore + workloadScore + zoneBonus, 2);

    return {
      agentId: agent.id,
      userId: agent.userId,
      distanceKm: distanceKm === Infinity ? -1 : roundTo(distanceKm, 2),
      activeOrders,
      workloadScore,
      finalScore,
      zoneMatch: tier === "SAME_ZONE" ? "SAME" : tier === "ADJACENT_ZONE" ? "ADJACENT" : "ANY",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — ATOMIC COMMIT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Persists the assignment atomically using a Prisma transaction.
   *
   * WHY a transaction?
   *   Between scoring and committing, another request could assign the same
   *   agent. We use a transaction to:
   *     1. Re-verify the agent is still AVAILABLE inside the tx
   *     2. Update Order.agentId + Order.status atomically
   *     3. Set AgentProfile.status = BUSY
   *     4. Insert the first TrackingEvent (PICKUP_SCHEDULED)
   *
   *   If re-verification fails (agent grabbed by a concurrent request),
   *   the transaction rolls back and the caller should retry.
   */
  private async commitAssignment(
    orderId: string,
    agentProfileId: string,
    agentUserId: string
  ): Promise<{ customerName: string; customerEmail: string; customerPhone: string; orderNumber: string; agentName: string; agentPhone: string }> {
    return this.prisma.$transaction(async (tx) => {
      // Re-verify agent is still available (guard against race condition)
      const agent = await tx.agentProfile.findUniqueOrThrow({
        where: { id: agentProfileId },
        include: { user: true },
      });

      if (agent.status !== AgentStatus.AVAILABLE) {
        throw new Error(
          `Agent ${agentProfileId} is no longer available. ` +
          `Assignment rolled back — caller should retry.`
        );
      }

      // Fetch a system/admin user id for the SYSTEM actor on tracking events
      // In production this would be a seeded "SYSTEM" user id from config
      const systemUser = await tx.user.findFirstOrThrow({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      // 1. Assign order to agent + advance status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          agentId: agentUserId,
          status: OrderStatus.PICKUP_SCHEDULED,
        },
        include: { customer: true },
      });

      // 2. Mark agent as BUSY
      await tx.agentProfile.update({
        where: { id: agentProfileId },
        data: { status: AgentStatus.BUSY },
      });

      // 3. Append immutable tracking event
      await tx.trackingEvent.create({
        data: {
          orderId,
          status: OrderStatus.PICKUP_SCHEDULED,
          actorId: systemUser.id,
          eventSource: "SYSTEM",
          notes: `Auto-assigned to agent ${agentUserId}.`,
        },
      });

      return {
        customerName: updatedOrder.customer.fullName,
        customerEmail: updatedOrder.customer.email,
        customerPhone: updatedOrder.customer.phone,
        orderNumber: updatedOrder.orderNumber,
        agentName: agent.user.fullName,
        agentPhone: agent.user.phone,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK — RETRY QUEUE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * When no agent is available, we do NOT fail the order.
   * Instead, we mark it for retry so a background job can re-run assignment.
   *
   * The retry job (e.g., a Bull/BullMQ worker or cron) queries all orders
   * with status CREATED and scheduledPickupAt IS NULL every 5 minutes.
   *
   * In production, extend this to:
   *   - Publish a "ASSIGNMENT_FAILED" event to a message queue (e.g., SQS/Kafka)
   *   - Notify the customer of a delay via push notification
   *   - Escalate to admin dashboard after N retries
   */
  private async queueForRetry(orderId: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        // Keep status as CREATED — retry job filters on this
        notes: `Auto-assignment failed at ${new Date().toISOString()}. Queued for retry.`,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESCHEDULING FLOW (Post-Failed Delivery)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Called when an order reaches status FAILED.
   *
   * FAILED DELIVERY FLOW:
   *   1. Increment failedAttempts on the original order
   *   2. If failedAttempts < maxAttempts:
   *        a. Create a RESCHEDULED child order (parentOrderId = original)
   *        b. Free the failed agent (set AVAILABLE again)
   *        c. Run assignAgent() on the new order (gets a DIFFERENT agent)
   *   3. If failedAttempts >= maxAttempts:
   *        → Escalate to admin; order stays FAILED
   *
   * @param failedOrderId   The order that just failed
   * @param failureReason   Free-text reason from agent app
   * @param actorId         The agent's userId who reported the failure
   */
  async handleFailedDelivery(
    failedOrderId: string,
    failureReason: string,
    actorId: string
  ): Promise<{ rescheduledOrderId?: string; escalated: boolean }> {

    return this.prisma.$transaction(async (tx) => {
      // Fetch the failed order with all needed fields
      const failedOrder = await tx.order.findUniqueOrThrow({
        where: { id: failedOrderId },
        include: {
          pickupAddress: { include: { area: { include: { zone: true } } } },
        },
      });

      // Append FAILED tracking event
      await tx.trackingEvent.create({
        data: {
          orderId: failedOrderId,
          status: OrderStatus.FAILED,
          actorId,
          eventSource: "AGENT_APP",
          notes: failureReason,
          latitude: failedOrder.pickupAddress.latitude ?? undefined,
          longitude: failedOrder.pickupAddress.longitude ?? undefined,
        },
      });

      const newAttempts = failedOrder.failedAttempts + 1;

      // Update the failed order
      await tx.order.update({
        where: { id: failedOrderId },
        data: {
          status: OrderStatus.FAILED,
          failedAttempts: newAttempts,
          failureReason,
        },
      });

      // Free the agent who failed the delivery
      if (failedOrder.agentId) {
        await tx.agentProfile.updateMany({
          where: { userId: failedOrder.agentId },
          data: { status: AgentStatus.AVAILABLE },
        });
      }

      // Check if rescheduling is possible
      if (newAttempts >= failedOrder.maxAttempts) {
        return { escalated: true };
      }

      // Create rescheduled order (child order, inherits all fields)
      const rescheduled = await tx.order.create({
        data: {
          customerId:          failedOrder.customerId,
          pickupAddressId:     failedOrder.pickupAddressId,
          dropAddressId:       failedOrder.dropAddressId,
          pickupZoneId:        failedOrder.pickupZoneId,
          dropZoneId:          failedOrder.dropZoneId,
          routeType:           failedOrder.routeType,
          lengthCm:            failedOrder.lengthCm,
          breadthCm:           failedOrder.breadthCm,
          heightCm:            failedOrder.heightCm,
          actualWeightKg:      failedOrder.actualWeightKg,
          volumetricWeightKg:  failedOrder.volumetricWeightKg,
          billableWeightKg:    failedOrder.billableWeightKg,
          businessType:        failedOrder.businessType,
          paymentType:         failedOrder.paymentType,
          rateCardId:          failedOrder.rateCardId,   // Same rate snapshot!
          baseCharge:          failedOrder.baseCharge,
          weightCharge:        failedOrder.weightCharge,
          codSurcharge:        failedOrder.codSurcharge,
          totalCharge:         failedOrder.totalCharge,
          codCollectAmount:    failedOrder.codCollectAmount,
          maxAttempts:         failedOrder.maxAttempts,
          failedAttempts:      newAttempts,              // Carry forward
          status:              OrderStatus.RESCHEDULED,
          parentOrderId:       failedOrderId,
          notes: `Rescheduled from order ${failedOrder.orderNumber}. Attempt ${newAttempts + 1} of ${failedOrder.maxAttempts}.`,
        },
      });

      // Append RESCHEDULED event to the new order
      await tx.trackingEvent.create({
        data: {
          orderId: rescheduled.id,
          status: OrderStatus.RESCHEDULED,
          actorId,
          eventSource: "SYSTEM",
          notes: `Created from failed order ${failedOrder.orderNumber}.`,
        },
      });

      return { rescheduledOrderId: rescheduled.id, escalated: false };
    });
  }
}
