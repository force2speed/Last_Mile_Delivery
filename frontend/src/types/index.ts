// src/types/index.ts — Shared frontend types
export type Role = "ADMIN" | "CUSTOMER" | "DELIVERY_AGENT";
export type OrderStatus =
  | "CREATED" | "PICKUP_SCHEDULED" | "PICKED_UP"
  | "IN_TRANSIT" | "OUT_FOR_DELIVERY"
  | "DELIVERED" | "FAILED" | "RESCHEDULED" | "CANCELLED";
export type PaymentType = "PREPAID" | "COD";
export type BusinessType = "B2B" | "B2C";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
}

export interface Zone { id: string; name: string; code: string; }
export interface Area { id: string; name: string; pincode: string; zoneId: string; zone: Zone; }

export interface TrackingEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  occurredAt: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  eventSource: string;
  actor: { fullName: string; role: Role; };
}

export interface PriceBreakdown {
  pickupZoneId: string;
  dropZoneId: string;
  routeType: "INTRA_ZONE" | "INTER_ZONE";
  weights: {
    actualWeightKg: number;
    volumetricWeightKg: number;
    billableWeightKg: number;
  };
  rateCardId: string;
  rateCardVersion: number;
  baseCharge: number;
  weightCharge: number;
  codSurcharge: number;
  totalCharge: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentType: PaymentType;
  businessType: BusinessType;
  totalCharge: number;
  baseCharge: number;
  weightCharge: number;
  codSurcharge: number;
  codCollectAmount: number | null;
  billableWeightKg: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  createdAt: string;
  deliveredAt: string | null;
  failureReason: string | null;
  customer: { fullName: string; email: string; phone: string; };
  agent: { fullName: string; phone: string; } | null;
  pickupAddress: { street: string; city: string; state: string; latitude: number | null; longitude: number | null; };
  dropAddress:   { street: string; city: string; state: string; latitude: number | null; longitude: number | null; };
  rateCard: { name: string; version: number; };
  trackingHistory: TrackingEvent[];
  nextStates: OrderStatus[];
}
