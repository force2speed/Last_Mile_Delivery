// =============================================================================
// utils/geo.utils.ts — Geospatial helpers
// =============================================================================

/**
 * Haversine formula: computes great-circle distance between two GPS coordinates.
 * Returns distance in kilometres.
 *
 * Used by: AgentAssignmentService to rank agents by proximity to pickup point.
 *
 * @param lat1  Latitude  of point A (decimal degrees)
 * @param lon1  Longitude of point A (decimal degrees)
 * @param lat2  Latitude  of point B (decimal degrees)
 * @param lon2  Longitude of point B (decimal degrees)
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts a Prisma Decimal (stored as string-like object) to a JS number safely.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return parseFloat(String(value));
}

/**
 * Rounds a number to N decimal places (banker-safe via toFixed).
 */
export function roundTo(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}
