// =============================================================================
// routes/index.ts — All API Route Definitions
// =============================================================================

import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Stripe from "stripe";
import { authenticate, authorize, agentOwnsOrder } from "../middleware/auth.middleware";
import { OrderController } from "../controllers/order.controller";

const router = Router();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

// =============================================================================
// ── AUTH ROUTES (/api/auth) ───────────────────────────────────────────────────
// =============================================================================

/** POST /api/auth/register — Register a new customer account */
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, phone, role: Role.CUSTOMER },
      select: { id: true, email: true, fullName: true, role: true },
    });
    return res.status(201).json({ user });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email or phone already registered." });
    }
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/auth/login — Authenticate and receive JWT */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated." });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );
    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/auth/google — Authenticate via Google */
router.post("/auth/google", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const email = payload.email;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Auto-register customer if they don't exist
      user = await prisma.user.create({
        data: {
          email,
          fullName: payload.name || "Google User",
          phone: `GGL-${Date.now()}`, // Placeholder since Google doesn't always provide phone
          role: Role.CUSTOMER,
          googleId: payload.sub,
        },
      });
    } else if (!user.googleId) {
      // Link existing account to Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated." });
    }

    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );
    return res.status(200).json({
      token: jwtToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

/** GET /api/auth/me — Get current user profile */
router.get("/auth/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, fullName: true, phone: true, role: true, createdAt: true },
  });
  return res.status(200).json({ user });
});

/** PATCH /api/auth/me — Update current user profile */
router.patch("/auth/me", authenticate, async (req, res) => {
  try {
    const { fullName, phone, currentPassword, newPassword } = req.body;
    
    // If updating password, verify current password first
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Current password is required to set a new password." });
      
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user) return res.status(404).json({ error: "User not found." });
      
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) return res.status(401).json({ error: "Incorrect current password." });
    }

    const dataToUpdate: any = {};
    if (fullName) dataToUpdate.fullName = fullName;
    if (phone) dataToUpdate.phone = phone;
    if (newPassword) dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: dataToUpdate,
      select: { id: true, email: true, fullName: true, phone: true, role: true, createdAt: true },
    });

    return res.status(200).json({ user: updatedUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ── ADMIN ROUTES (/api/admin) ─────────────────────────────────────────────────
// =============================================================================

const adminOnly = [authenticate, authorize(Role.ADMIN)];

/** GET /api/admin/users — List all users (paginated) */
router.get("/admin/users", ...adminOnly, async (req, res) => {
  const { role, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where = role ? { role: role as Role } : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: parseInt(limit as string),
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);
  return res.status(200).json({ data: users, meta: { total } });
});

/** POST /api/admin/users — Create admin or agent account */
router.post("/admin/users", ...adminOnly, async (req, res) => {
  try {
    const { email, password, fullName, phone, role, homeZoneId, vehicleType, vehicleNumber } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email, passwordHash, fullName, phone, role,
        ...(role === Role.DELIVERY_AGENT && {
          agentProfile: {
            create: { homeZoneId, vehicleType, vehicleNumber },
          },
        }),
      },
      include: { agentProfile: true },
    });
    return res.status(201).json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/admin/users/:userId/status — Activate/Deactivate user */
router.patch("/admin/users/:userId/status", ...adminOnly, async (req, res) => {
  const { isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.userId },
    data: { isActive },
    select: { id: true, email: true, isActive: true },
  });
  return res.status(200).json({ user });
});

/** GET /api/admin/rate-cards — List all rate cards (all versions) */
router.get("/admin/rate-cards", ...adminOnly, async (req, res) => {
  const cards = await prisma.rateCard.findMany({
    orderBy: [{ businessType: "asc" }, { effectiveFrom: "desc" }],
    include: { createdBy: { select: { fullName: true } } },
  });
  return res.status(200).json({ data: cards });
});

/** POST /api/admin/rate-cards — Create new rate card version
 *  Automatically deactivates the previous active card for that businessType */
router.post("/admin/rate-cards", ...adminOnly, async (req, res) => {
  try {
    const { businessType, name, baseRateIntraZone, perKgRateIntraZone,
            baseRateInterZone, perKgRateInterZone, codSurchargeFlat, codSurchargePercent } = req.body;

    const newCard = await prisma.$transaction(async (tx) => {
      // Deactivate existing active cards for this business type
      await tx.rateCard.updateMany({
        where: { businessType, isActive: true },
        data:  { isActive: false, effectiveTo: new Date() },
      });

      // Get current max version for naming
      const lastVersion = await tx.rateCard.findFirst({
        where: { businessType },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      return tx.rateCard.create({
        data: {
          name, businessType,
          version: (lastVersion?.version ?? 0) + 1,
          baseRateIntraZone, perKgRateIntraZone,
          baseRateInterZone, perKgRateInterZone,
          codSurchargeFlat:    codSurchargeFlat ?? 0,
          codSurchargePercent: codSurchargePercent ?? 0,
          isActive:    true,
          createdById: req.user!.userId,
        },
      });
    });

    return res.status(201).json({ rateCard: newCard });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/zones — List all zones with areas */
router.get("/admin/zones", authenticate, async (req, res) => {
  const zones = await prisma.zone.findMany({
    include: { areas: true },
    orderBy: { name: "asc" },
  });
  return res.status(200).json({ data: zones });
});

/** POST /api/admin/zones — Create a zone */
router.post("/admin/zones", ...adminOnly, async (req, res) => {
  const zone = await prisma.zone.create({ data: req.body });
  return res.status(201).json({ zone });
});

/** POST /api/admin/zones/:zoneId/areas — Add area to zone */
router.post("/admin/zones/:zoneId/areas", ...adminOnly, async (req, res) => {
  const area = await prisma.area.create({
    data: { ...req.body, zoneId: req.params.zoneId },
  });
  return res.status(201).json({ area });
});

/** GET /api/admin/dashboard — System-wide stats */
router.get("/admin/dashboard", ...adminOnly, async (req, res) => {
  const [totalOrders, byStatus, availableAgents, totalRevenue] = await Promise.all([
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.agentProfile.count({ where: { status: "AVAILABLE" } }),
    prisma.order.aggregate({
      where: { status: "DELIVERED" },
      _sum: { totalCharge: true },
    }),
  ]);

  return res.status(200).json({
    totalOrders,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
    availableAgents,
    totalRevenue: totalRevenue._sum.totalCharge ?? 0,
  });
});

/** GET /api/admin/reports — Historical analytics and map data */
router.get("/admin/reports", ...adminOnly, async (req, res) => {
  try {
    // 1. Get daily revenue for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // In SQLite/Prisma without raw SQL grouping by date is tricky, so we fetch and group in memory
    const recentDeliveredOrders = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true, totalCharge: true }
    });

    const revenueByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      revenueByDay[d.toISOString().split('T')[0]] = 0;
    }

    recentDeliveredOrders.forEach(order => {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (revenueByDay[dateStr] !== undefined) {
        revenueByDay[dateStr] += Number(order.totalCharge || 0);
      }
    });

    // 2. Get active/recent order coordinates for heatmap (limit 500)
    const mapOrders = await prisma.order.findMany({
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        pickupAddress: { select: { latitude: true, longitude: true, city: true } },
        dropAddress: { select: { latitude: true, longitude: true, city: true } }
      }
    });

    return res.status(200).json({
      revenueTrend: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
      heatMapData: mapOrders.map(o => ({
        id: o.id,
        status: o.status,
        pickup: o.pickupAddress,
        drop: o.dropAddress
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ── ORDER ROUTES (/api/orders) ────────────────────────────────────────────────
// =============================================================================

/** POST /api/rate/calculate — Preview rate without creating an order */
router.post(
  "/rate/calculate",
  authenticate,
  OrderController.calculateRate
);

/** POST /api/orders — Place a new order (customers) */
router.post(
  "/orders",
  authenticate,
  authorize(Role.CUSTOMER, Role.ADMIN),
  OrderController.createOrder
);

/** GET /api/orders — List orders (filtered by role) */
router.get(
  "/orders",
  authenticate,
  OrderController.listOrders
);

/** GET /api/orders/:orderId — Get single order + tracking history */
router.get(
  "/orders/:orderId",
  authenticate,
  OrderController.getOrder
);

/** PATCH /api/orders/:orderId/status — Update order status (CRITICAL) */
router.patch(
  "/orders/:orderId/status",
  authenticate,
  // Agents can only update orders assigned to them
  // Admins bypass this check (handled inside middleware)
  agentOwnsOrder(prisma),
  OrderController.updateStatus
);

/** GET /api/orders/:orderId/tracking — Get tracking timeline only */
router.get("/orders/:orderId/tracking", authenticate, async (req, res) => {
  const events = await prisma.trackingEvent.findMany({
    where:   { orderId: req.params.orderId },
    orderBy: { occurredAt: "asc" },
    include: { actor: { select: { fullName: true, role: true } } },
  });
  return res.status(200).json({ data: events });
});

/** GET /api/orders/track/:orderNumber — Public tracking (no auth required) */
router.get("/orders/track/:orderNumber", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.params.orderNumber },
    select: {
      orderNumber: true, status: true, createdAt: true, totalCharge: true, paymentType: true, paymentStatus: true,
      dropAddress: { select: { city: true, state: true } },
      trackingHistory: {
        orderBy: { occurredAt: "asc" },
        select: { status: true, occurredAt: true, notes: true, latitude: true, longitude: true },
      },
    },
  });
  if (!order) return res.status(404).json({ error: "Order not found." });
  return res.status(200).json({ order });
});

// =============================================================================
// ── STRIPE PAYMENT ROUTES (/api/payments) ─────────────────────────────────────
// =============================================================================

/** POST /api/orders/:orderId/pay — Create Stripe PaymentIntent */
router.post("/orders/:orderId/pay", authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.customerId !== req.user!.userId) return res.status(403).json({ error: "Unauthorized" });
    if (order.paymentType !== "PREPAID") return res.status(400).json({ error: "Order is not prepaid" });
    if (order.paymentStatus === "PAID") return res.status(400).json({ error: "Order already paid" });

    // If there's an existing intent, we could reuse it, but creating a new one is easier for now
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.totalCharge) * 100), // Stripe expects amounts in cents
      currency: "inr", // Assuming INR for LastMile
      metadata: { orderId: order.id },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: paymentIntent.id },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/webhooks/stripe — Handle Stripe Webhooks */
// Note: In a real app, you MUST parse the raw body here to verify the Stripe signature.
// For this prototype, we'll parse JSON normally, but warn about it.
router.post("/webhooks/stripe", async (req, res) => {
  try {
    const event = req.body;
    
    // Handle successful payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "PAID" },
        });
        console.log(`Payment succeeded for order ${orderId}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =============================================================================
// ── AGENT ROUTES (/api/agents) ────────────────────────────────────────────────
// =============================================================================

const agentOrAdmin = [authenticate, authorize(Role.DELIVERY_AGENT, Role.ADMIN)];

/** GET /api/agents/me/orders — Agent's active assigned orders */
router.get("/agents/me/orders", ...agentOrAdmin, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: {
      agentId: req.user!.userId,
      status:  { in: ["PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
    },
    include: {
      pickupAddress: { select: { street: true, city: true, latitude: true, longitude: true } },
      dropAddress:   { select: { street: true, city: true, latitude: true, longitude: true } },
      customer:      { select: { fullName: true, phone: true } },
    },
    orderBy: { scheduledPickupAt: "asc" },
  });
  return res.status(200).json({ data: orders });
});

/** PATCH /api/agents/me/location — Update agent GPS location */
router.patch("/agents/me/location", ...agentOrAdmin, async (req, res) => {
  const { latitude, longitude, zoneId } = req.body;
  const profile = await prisma.agentProfile.update({
    where: { userId: req.user!.userId },
    data:  {
      currentLatitude:  latitude,
      currentLongitude: longitude,
      lastLocationAt:   new Date(),
      ...(zoneId ? { currentZoneId: zoneId } : {}),
    },
  });
  return res.status(200).json({ profile });
});

/** PATCH /api/agents/me/status — Toggle agent availability */
router.patch("/agents/me/status", ...agentOrAdmin, async (req, res) => {
  const { status } = req.body; // AVAILABLE | OFFLINE
  const profile = await prisma.agentProfile.update({
    where: { userId: req.user!.userId },
    data:  { status },
  });
  return res.status(200).json({ profile });
});

/** GET /api/agents — List all agents with workload (admin only) */
router.get("/agents", ...adminOnly, async (req, res) => {
  const agents = await prisma.agentProfile.findMany({
    include: {
      user:        { select: { fullName: true, email: true, phone: true, isActive: true } },
      currentZone: { select: { name: true, code: true } },
      homeZone:    { select: { name: true, code: true } },
    },
    orderBy: { status: "asc" },
  });

  // Attach live active order count
  const agentUserIds = agents.map((a) => a.userId);
  const workloads = await prisma.order.groupBy({
    by: ["agentId"],
    where: {
      agentId: { in: agentUserIds },
      status:  { in: ["PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
    },
    _count: { agentId: true },
  });
  const workloadMap = new Map(workloads.map((w) => [w.agentId, w._count.agentId]));

  const result = agents.map((a) => ({
    ...a,
    activeOrders: workloadMap.get(a.userId) ?? 0,
  }));

  return res.status(200).json({ data: result });
});

export default router;
