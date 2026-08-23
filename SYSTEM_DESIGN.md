# System Design Write-up: LastMile Delivery Tracker

## Overview
LastMile Delivery Tracker manages the lifecycle of last-mile shipments — from dynamic pricing to real-time tracking and failure recovery. It uses four core engines designed for concurrency, integrity, and scalability.

---

## 1. Rate Calculation Engine Architecture
The rate engine ensures no rate is hardcoded, maintaining configurability. It computes prices dynamically in six steps:

1. Resolves pickup and drop areas to their parent Zones simultaneously.
2. Derives route type: `INTRA_ZONE` if pickup/drop zones match, else `INTER_ZONE`.
3. Computes billable weight: `MAX(actualWeightKg, (L × B × H) / 5000)`. All values are persisted for reproducibility.
4. Queries the active `RateCard` for the `businessType` using temporal filtering to fetch the latest effective card.
5. Applies base and per-kg rates based on the route type. COD surcharges apply only for COD orders.
6. The `rateCardId` is stored as an immutable foreign key on the Order (Rate Card Versioning). Future rate changes never reprice past orders.

---

## 2. Zone Detection Approach
Geographic inputs (pincodes) resolve to structured zones driving pricing and assignment.

The schema uses a hierarchy: `Zone → Area → Address`. Upon order placement, area IDs resolve to parent `Zone` records in a single database trip. The `pickupZoneId` and `dropZoneId` are denormalized onto the Order row, ensuring O(1) zone lookups for future operations without multi-table joins. 

Each `Address` optionally stores latitude/longitude, enabling precision distance calculations when fresh agent GPS data is available.

---

## 3. Auto-Assignment Algorithm
The assignment engine optimizes for proximity and workload while handling edge cases.

**Candidate Filtering:** Eligible agents must have `AVAILABLE` status and a GPS ping within 30 minutes to ensure proximity accuracy.

**Workload Computation:** Agents with ≥8 active orders are hard-excluded. This prevents single points of failure by refusing to overload highly available agents.

**Multi-Factor Scoring:** Candidates receive a composite score: distance (0–50 points, via Haversine formula), workload (0–40 points), and a zone bonus (-10 points for agents already in the pickup zone). Lowest score wins, balancing proximity against load.

**Concurrency Safety:** Assignment uses a `prisma.$transaction` to re-verify the winning agent's status before committing. This prevents TOCTOU race conditions where simultaneous orders assign the same agent. Failures trigger fallbacks to the next best agent, then system-wide agents, and finally a retry queue.

---

## 4. Failed Delivery Handling & Immutable Tracking
**Immutable Tracking Log:** Status transitions generate append-only `TrackingEvent` records capturing status, timestamp, actor ID, and GPS coordinates. Zero UPDATE paths exist, ensuring a forensic audit trail for disputes and compliance.

**Failed Delivery Flow:** When delivery fails, an atomic transaction appends a `FAILED` tracking event, increments `failedAttempts`, logs the reason, and resets the agent to `AVAILABLE`. 

If retry attempts remain, a **child Order** is created (`parentOrderId` pointing to the failed order). It copies the original `rateCardId` to prevent repricing and enters the assignment queue, explicitly avoiding the previous agent. If attempts are exhausted, the order escalates to administrators.

**Non-blocking Notifications:** Email/SMS notifications fire post-transaction. Delivery channel failures log warnings but never roll back primary order state commits.
