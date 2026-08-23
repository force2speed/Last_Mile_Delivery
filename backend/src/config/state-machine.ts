// =============================================================================
// config/state-machine.ts — Order Status State Machine
// =============================================================================
//
// DESIGN PATTERN: Transition Table (lookup-based, not switch-based)
//   Each key is the CURRENT status. Its value is a set of VALID next statuses
//   paired with the roles allowed to make that specific transition.
//
// ENFORCEMENT: The OrderController.updateStatus() method calls
//   StateMachine.validate() before ANY DB write. An invalid transition
//   throws a 422 Unprocessable Entity error.
//
// ROLE MATRIX SUMMARY:
//   ADMIN          → Can override most transitions (ops/support use cases)
//   DELIVERY_AGENT → Drives field-level transitions (pickup, transit, delivery)
//   CUSTOMER       → Can only cancel (before agent is assigned)
//   SYSTEM         → Internal service calls (auto-assignment, retry jobs)
// =============================================================================

import { OrderStatus, Role } from "@prisma/client";

export type Actor = Role | "SYSTEM";

export interface TransitionRule {
  to: OrderStatus;
  allowedActors: Actor[];
}

/**
 * The canonical state transition table.
 *
 * READ AS: "From status X, transition to Y is allowed if the actor is in Z."
 *
 * State machine diagram:
 *
 *   CREATED ──────────────────────────────────────────────── CANCELLED
 *      │                                                         ▲
 *      │ (auto-assign)                                           │
 *      ▼                                                         │
 *   PICKUP_SCHEDULED ─────────────────────────────────────── CANCELLED
 *      │                                                         ▲
 *      │ (agent picks up)                                        │
 *      ▼                                                         │
 *   PICKED_UP ────────────────────────────────────────────── CANCELLED(admin)
 *      │
 *      │ (in movement)
 *      ▼
 *   IN_TRANSIT
 *      │
 *      │ (last mile begins)
 *      ▼
 *   OUT_FOR_DELIVERY
 *      │              │
 *      │ (success)    │ (failure)
 *      ▼              ▼
 *   DELIVERED       FAILED ──► RESCHEDULED ──► PICKUP_SCHEDULED
 */
export const STATE_TRANSITIONS: Record<OrderStatus, TransitionRule[]> = {
  [OrderStatus.CREATED]: [
    { to: OrderStatus.PICKUP_SCHEDULED, allowedActors: ["SYSTEM", Role.ADMIN] },
    { to: OrderStatus.CANCELLED,        allowedActors: [Role.ADMIN, Role.CUSTOMER] },
  ],
  [OrderStatus.PICKUP_SCHEDULED]: [
    { to: OrderStatus.PICKED_UP,   allowedActors: [Role.DELIVERY_AGENT, Role.ADMIN] },
    { to: OrderStatus.CANCELLED,   allowedActors: [Role.ADMIN] },
    // Allow re-assignment (admin re-triggers auto-assign)
    { to: OrderStatus.CREATED,     allowedActors: [Role.ADMIN] },
  ],
  [OrderStatus.PICKED_UP]: [
    { to: OrderStatus.IN_TRANSIT,       allowedActors: [Role.DELIVERY_AGENT, Role.ADMIN] },
    { to: OrderStatus.OUT_FOR_DELIVERY, allowedActors: [Role.DELIVERY_AGENT, Role.ADMIN] },
    { to: OrderStatus.CANCELLED,        allowedActors: [Role.ADMIN] },
  ],
  [OrderStatus.IN_TRANSIT]: [
    { to: OrderStatus.OUT_FOR_DELIVERY, allowedActors: [Role.DELIVERY_AGENT, Role.ADMIN] },
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    { to: OrderStatus.DELIVERED, allowedActors: [Role.DELIVERY_AGENT, Role.ADMIN] },
    { to: OrderStatus.FAILED,    allowedActors: [Role.DELIVERY_AGENT, Role.ADMIN] },
  ],
  // Terminal states — no outbound transitions allowed from service layer
  // RESCHEDULED is handled internally by AgentAssignmentService
  [OrderStatus.DELIVERED]:   [],
  [OrderStatus.CANCELLED]:   [],
  [OrderStatus.FAILED]: [
    { to: OrderStatus.RESCHEDULED, allowedActors: ["SYSTEM", Role.ADMIN] },
  ],
  [OrderStatus.RESCHEDULED]: [
    { to: OrderStatus.PICKUP_SCHEDULED, allowedActors: ["SYSTEM", Role.ADMIN] },
    { to: OrderStatus.CANCELLED,        allowedActors: [Role.ADMIN] },
  ],
};

export class StateMachine {
  /**
   * Validates a proposed status transition.
   * Throws a descriptive error if the transition is illegal.
   *
   * @param from      Current order status
   * @param to        Requested next status
   * @param actor     Role of the requesting user (or "SYSTEM")
   */
  static validate(from: OrderStatus, to: OrderStatus, actor: Actor): void {
    if (from === to) {
      throw new StatusTransitionError(
        `Order is already in status "${from}". No change applied.`,
        422
      );
    }

    const rules = STATE_TRANSITIONS[from] ?? [];
    const matchingRule = rules.find((r) => r.to === to);

    if (!matchingRule) {
      throw new StatusTransitionError(
        `Invalid transition: "${from}" → "${to}". ` +
        `Allowed next states: [${rules.map((r) => r.to).join(", ") || "none"}].`,
        422
      );
    }

    if (!matchingRule.allowedActors.includes(actor)) {
      throw new StatusTransitionError(
        `Role "${actor}" cannot perform transition "${from}" → "${to}". ` +
        `Allowed actors: [${matchingRule.allowedActors.join(", ")}].`,
        403
      );
    }
  }

  /** Returns all valid next statuses for a given current status + actor role. */
  static nextStates(from: OrderStatus, actor: Actor): OrderStatus[] {
    return (STATE_TRANSITIONS[from] ?? [])
      .filter((r) => r.allowedActors.includes(actor))
      .map((r) => r.to);
  }
}

export class StatusTransitionError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "StatusTransitionError";
  }
}
