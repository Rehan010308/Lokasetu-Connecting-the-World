import type { Geo } from './types';
import { ALL_LOCALITIES, cityOfLocality, geoOf } from './cities';

/** Great-circle distance between two points, in km. */
export function distanceKm(a: Geo, b: Geo): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Hyperlocal priority bands from the product spec. */
export function proximityBand(km: number): 'high' | 'medium' | 'low' | 'out' {
  if (km <= 2) return 'high';
  if (km <= 5) return 'medium';
  if (km <= 10) return 'low';
  return 'out';
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Kept as a compatibility shim.
 *
 * AREAS used to be the entire geography of the product: six hard-coded
 * Bengaluru points that every worker and job shared, which is what produced
 * "0 m away". Real places now live in lib/cities.ts. These stay only so that
 * older references keep resolving, and they resolve to the same localities.
 */
export const AREAS: Geo[] = [
  geoOf('blr_koramangala')!,
  geoOf('blr_hsr')!,
  geoOf('blr_indiranagar')!,
  geoOf('blr_btm')!,
  geoOf('blr_jayanagar')!,
  geoOf('blr_whitefield')!,
];

/**
 * Reverse geocoding, near enough for a demo: the closest known locality out of
 * every city we cover. A real deployment swaps this for a geocoding call — the
 * signature does not change.
 */
export function nearestArea(lat: number, lng: number): Geo {
  let best = ALL_LOCALITIES[0];
  let bestD = Infinity;
  for (const l of ALL_LOCALITIES) {
    const d = distanceKm({ lat, lng, areaName: '' }, { lat: l.lat, lng: l.lng, areaName: '' });
    if (d < bestD) { bestD = d; best = l; }
  }
  const c = cityOfLocality(best.id);
  return {
    lat, lng,
    areaName: c ? `${best.name}, ${c.name}` : best.name,
    localityId: best.id,
    cityId: c?.id,
  };
}

/**
 * How far apart two points are, for display.
 *
 * Guards the "0 m away" bug at the render boundary as well as at the data
 * layer: if two entities really do land on the same point, say "nearby"
 * rather than printing a distance no physical world produces.
 */
export function formatDistance(km: number, nearbyLabel = 'nearby'): string {
  if (!isFinite(km) || km < 0.05) return nearbyLabel;
  return formatKm(km);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
