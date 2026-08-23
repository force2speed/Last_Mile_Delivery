// =============================================================================
// services/rate-calculation.service.ts
// =============================================================================
//
// RESPONSIBILITY:
//   Given an order request, this service:
//     1. Resolves pickup & drop pincodes → Areas → Zones
//     2. Computes all three weight metrics
//     3. Looks up the correct, active RateCard (versioned)
//     4. Applies the full rate formula (no hardcoding)
//     5. Returns a complete price breakdown ready to persist on the Order
//
// DESIGN NOTES:
//   - All DB Decimal fields are cast to JS numbers at the boundary (toNumber)
//   - Rounding uses toFixed(2) to avoid floating-point drift in money
//   - The rateCardId returned MUST be saved on the Order (historical pricing)
//   - This service is stateless and fully testable with a mocked PrismaClient
// =============================================================================

import { PrismaClient, BusinessType, PaymentType, RouteType } from "@prisma/client";
import { toNumber, roundTo } from "../utils/geo.utils";
import {
  RateCalculationInput,
  RateCalculationResult,
  WeightBreakdown,
} from "../types/order.types";

export class RateCalculationService {
  constructor(private readonly prisma: PrismaClient) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Main entry point.
   *
   * STEP-BY-STEP FLOW:
   *  [1] Zone Detection   → resolve each areaId to its parent Zone
   *  [2] Route Type       → INTRA_ZONE if zones match, else INTER_ZONE
   *  [3] Weight Math      → volumetric + billable weight
   *  [4] Rate Card Lookup → find active card matching businessType & date
   *  [5] Price Formula    → base + weight + COD surcharge
   *  [6] Return snapshot  → caller persists all values on the Order row
   */
  async calculate(input: RateCalculationInput): Promise<RateCalculationResult> {
    // ── [1] Zone Detection ────────────────────────────────────────────────────
    const { pickupZone, dropZone } = await this.resolveZones(
      input.pickupAreaId,
      input.dropAreaId
    );

    // ── [2] Route Type ────────────────────────────────────────────────────────
    const routeType: RouteType =
      pickupZone.id === dropZone.id
        ? RouteType.INTRA_ZONE
        : RouteType.INTER_ZONE;

    // ── [3] Weight Math ───────────────────────────────────────────────────────
    const weights = this.computeWeights(
      input.lengthCm,
      input.breadthCm,
      input.heightCm,
      input.actualWeightKg
    );

    // ── [4] Rate Card Lookup ──────────────────────────────────────────────────
    const rateCard = await this.fetchActiveRateCard(input.businessType);

    // ── [5] Price Formula ─────────────────────────────────────────────────────
    const pricing = this.applyRateFormula(
      weights.billableWeightKg,
      routeType,
      input.paymentType,
      input.codCollectAmount ?? 0,
      rateCard
    );

    // ── [6] Assemble result ───────────────────────────────────────────────────
    return {
      pickupZoneId: pickupZone.id,
      dropZoneId: dropZone.id,
      routeType,
      weights,
      rateCardId: rateCard.id,
      rateCardVersion: rateCard.version,
      ...pricing,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — ZONE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolves two areaIds to their parent Zone records.
   *
   * WHY store both zone fields on Order?
   *   Denormalising zoneId onto the Order avoids a multi-join on every
   *   rate query and enables fast zone-level analytics/reporting.
   *
   * APPROACH:
   *   Area → Zone is a direct FK. A single `include` fetches both in one query.
   *   If either area is inactive or not found, we throw early — the API layer
   *   should have validated the pincode before calling this service.
   */
  private async resolveZones(pickupAreaId: string, dropAreaId: string) {
    const [pickupArea, dropArea] = await Promise.all([
      this.prisma.area.findUniqueOrThrow({
        where: { id: pickupAreaId, isActive: true },
        include: { zone: true },
      }),
      this.prisma.area.findUniqueOrThrow({
        where: { id: dropAreaId, isActive: true },
        include: { zone: true },
      }),
    ]);

    if (!pickupArea.zone.isActive) {
      throw new Error(
        `Pickup zone "${pickupArea.zone.name}" is currently inactive.`
      );
    }
    if (!dropArea.zone.isActive) {
      throw new Error(
        `Drop zone "${dropArea.zone.name}" is currently inactive.`
      );
    }

    return { pickupZone: pickupArea.zone, dropZone: dropArea.zone };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — WEIGHT MATH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Applies the industry-standard volumetric weight formula.
   *
   * FORMULA:
   *   volumetricWeightKg = (L × B × H) / 5000
   *   billableWeightKg   = MAX(actualWeightKg, volumetricWeightKg)
   *
   * WHY 5000?
   *   This is the courier-industry DIM divisor for centimetres.
   *   (For inches the divisor is 139; for metres it adjusts accordingly.)
   *
   * All three weights are returned and STORED on the Order for auditability.
   * If the divisor ever changes per carrier, it can be made a RateCard field.
   */
  private computeWeights(
    lengthCm: number,
    breadthCm: number,
    heightCm: number,
    actualWeightKg: number
  ): WeightBreakdown {
    const volumetricWeightKg = roundTo((lengthCm * breadthCm * heightCm) / 5000, 3);
    const billableWeightKg = roundTo(
      Math.max(actualWeightKg, volumetricWeightKg),
      3
    );

    return {
      actualWeightKg: roundTo(actualWeightKg, 3),
      volumetricWeightKg,
      billableWeightKg,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — RATE CARD LOOKUP (Versioned)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches the single active rate card for the given business type.
   *
   * VERSIONING GUARANTEE:
   *   We always query isActive=true AND effectiveFrom <= NOW AND
   *   (effectiveTo IS NULL OR effectiveTo > NOW). This ensures we use the
   *   rate card valid at the exact moment of order creation.
   *
   *   Older rate card rows remain in the DB untouched. Historical orders
   *   already reference their rate card by ID — they are never affected.
   *
   * ADMIN WORKFLOW TO UPDATE RATES:
   *   1. INSERT a new RateCard row (isActive=true, effectiveFrom=now)
   *   2. UPDATE old RateCard SET isActive=false, effectiveTo=now
   *   All future orders use the new card. All past orders keep the old FK.
   */
  private async fetchActiveRateCard(businessType: BusinessType) {
    const now = new Date();

    const rateCard = await this.prisma.rateCard.findFirst({
      where: {
        businessType,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: now } },
        ],
      },
      orderBy: { effectiveFrom: "desc" }, // Most recent active card wins
    });

    if (!rateCard) {
      throw new Error(
        `No active rate card found for business type: ${businessType}. ` +
        `Please ask an admin to configure one.`
      );
    }

    return rateCard;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — PRICE FORMULA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Applies the full rate formula. Zero hardcoded numbers — everything comes
   * from the RateCard record fetched in Step 4.
   *
   * FORMULA BREAKDOWN:
   *
   *   ┌─ Route Type? ──────────────────────────────────────────┐
   *   │  INTRA_ZONE → use baseRateIntraZone + perKgRateIntraZone │
   *   │  INTER_ZONE → use baseRateInterZone + perKgRateInterZone │
   *   └────────────────────────────────────────────────────────┘
   *
   *   baseCharge   = selectedBaseRate
   *   weightCharge = selectedPerKgRate × billableWeightKg
   *   shipmentCost = baseCharge + weightCharge
   *
   *   ┌─ Payment Type? ─────────────────────────────────────────┐
   *   │  PREPAID → codSurcharge = 0                              │
   *   │  COD     → codSurcharge = codSurchargeFlat              │
   *   │                         + (codSurchargePercent/100)      │
   *   │                           × codCollectAmount             │
   *   └────────────────────────────────────────────────────────┘
   *
   *   totalCharge = shipmentCost + codSurcharge
   *
   * NOTE: The COD percentage is applied to the COD COLLECTION AMOUNT
   *       (what the agent collects from recipient), not the shipment cost.
   *       This matches standard courier industry practice.
   */
  private applyRateFormula(
    billableWeightKg: number,
    routeType: RouteType,
    paymentType: PaymentType,
    codCollectAmount: number,
    rateCard: Awaited<ReturnType<typeof this.fetchActiveRateCard>>
  ) {
    // ── Select rates based on route type ──────────────────────────────────────
    const baseRate =
      routeType === RouteType.INTRA_ZONE
        ? toNumber(rateCard.baseRateIntraZone)
        : toNumber(rateCard.baseRateInterZone);

    const perKgRate =
      routeType === RouteType.INTRA_ZONE
        ? toNumber(rateCard.perKgRateIntraZone)
        : toNumber(rateCard.perKgRateInterZone);

    // ── Core charges ──────────────────────────────────────────────────────────
    const baseCharge   = roundTo(baseRate);
    const weightCharge = roundTo(perKgRate * billableWeightKg);
    const shipmentCost = roundTo(baseCharge + weightCharge);

    // ── COD surcharge ─────────────────────────────────────────────────────────
    let codSurcharge = 0;
    if (paymentType === PaymentType.COD) {
      const flatFee     = toNumber(rateCard.codSurchargeFlat);
      const percentFee  = toNumber(rateCard.codSurchargePercent);
      const percentPart = roundTo((percentFee / 100) * codCollectAmount);
      codSurcharge      = roundTo(flatFee + percentPart);
    }

    const totalCharge = roundTo(shipmentCost + codSurcharge);

    return { baseCharge, weightCharge, codSurcharge, totalCharge };
  }
}
