// =============================================================================
// middleware/auth.middleware.ts — JWT Authentication + RBAC Guard
// =============================================================================

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  userId: string;
  role: Role;
  email: string;
  iat: number;
  exp: number;
}

// Augment Express Request to carry decoded token
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// =============================================================================
// AUTHENTICATE — Verify JWT and attach user to request
// =============================================================================
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err: any) {
    const message =
      err.name === "TokenExpiredError" ? "Token has expired." : "Invalid token.";
    return res.status(401).json({ error: message });
  }
}

// =============================================================================
// AUTHORIZE — RBAC role guard (use after authenticate)
// =============================================================================
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required roles: [${allowedRoles.join(", ")}]. Your role: ${req.user.role}.`,
      });
    }
    next();
  };
}

// =============================================================================
// AGENT-OWNS-ORDER guard — delivery agents can only act on their own orders
// =============================================================================
export function agentOwnsOrder(prisma: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    // Admins bypass ownership check
    if (req.user.role === Role.ADMIN) return next();

    const orderId = req.params.orderId ?? req.params.id;
    if (!orderId) return res.status(400).json({ error: "Order ID required." });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { agentId: true },
    });

    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.agentId !== req.user.userId) {
      return res.status(403).json({ error: "You are not assigned to this order." });
    }
    next();
  };
}
