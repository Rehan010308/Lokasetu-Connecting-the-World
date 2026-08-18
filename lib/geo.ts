import type { Geo } from './types';

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

/** Demo localities. Swap for a real geocoder (Google/Mapbox/Ola Maps) later. */
export const AREAS: Geo[] = [
  { areaName: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { areaName: 'HSR Layout, Bengaluru', lat: 12.9121, lng: 77.6446 },
  { areaName: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 },
  { areaName: 'BTM Layout, Bengaluru', lat: 12.9166, lng: 77.6101 },
  { areaName: 'Jayanagar, Bengaluru', lat: 12.9250, lng: 77.5938 },
  { areaName: 'Whitefield, Bengaluru', lat: 12.9698, lng: 77.7500 },
];

/** Nearest known locality to a raw lat/lng - stands in for reverse geocoding. */
export function nearestArea(lat: number, lng: number): Geo {
  let best = AREAS[0];
  let bestD = Infinity;
  for (const a of AREAS) {
    const d = distanceKm({ lat, lng, areaName: '' }, a);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return { lat, lng, areaName: best.areaName };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
