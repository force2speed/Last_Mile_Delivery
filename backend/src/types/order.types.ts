// =============================================================================
// types/order.types.ts — Shared DTOs and domain types
// =============================================================================

import { BusinessType, OrderStatus, PaymentType, RouteType } from "@prisma/client";

// ── Rate Calculation ──────────────────────────────────────────────────────────

export interface RateCalculationInput {
  pickupAreaId: string;        // Resolved from pincode at API layer
  dropAreaId: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  businessType: BusinessType;  // B2B | B2C
  paymentType: PaymentType;    // PREPAID | COD
  codCollectAmount?: number;   // Required when paymentType === COD
}

export interface WeightBreakdown {
  actualWeightKg: number;
  volumetricWeightKg: number;  // (L * B * H) / 5000
  billableWeightKg: number;    // MAX(actual, volumetric)
}

export interface RateCalculationResult {
  // Zone resolution
  pickupZoneId: string;
  dropZoneId: string;
  routeType: RouteType;

  // Weight breakdown
  weights: WeightBreakdown;

  // Rate card used
  rateCardId: string;
  rateCardVersion: number;

  // Price breakdown
  baseCharge: number;
  weightCharge: number;
  codSurcharge: number;
  totalCharge: number;
}

// ── Agent Assignment ──────────────────────────────────────────────────────────

export interface AgentScore {
  agentId: string;
  userId: string;
  distanceKm: number;
  activeOrders: number;
  workloadScore: number;    // 0-100 normalized; lower = better
  finalScore: number;       // Composite score; lower = preferred
  zoneMatch: "SAME" | "ADJACENT" | "ANY";
}

export interface AssignmentResult {
  success: boolean;
  agentId?: string;
  agentUserId?: string;
  score?: AgentScore;
  fallbackTier?: "SAME_ZONE" | "ADJACENT_ZONE" | "ANY_ZONE";
  queuedForRetry?: boolean;
  reason?: string;
}
