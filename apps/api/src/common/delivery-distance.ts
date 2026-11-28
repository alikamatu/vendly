export const SAME_CITY_KM = 25;
export const NEARBY_KM = 80;

export function deliveryLimitKm(
  serviceArea: string | null | undefined,
): number | null {
  if (serviceArea === 'SAME_CITY') return SAME_CITY_KM;
  if (serviceArea === 'NEARBY_STATES') return NEARBY_KM;
  return null;
}

export function haversineKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function toCoord(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
