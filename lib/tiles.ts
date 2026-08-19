import type { Geo } from './types';

/* ===========================================================================
   SLIPPY-MAP MATHS
   ---------------------------------------------------------------------------
   Enough of the Web Mercator projection to place raster tiles and pin markers
   on them, with no mapping library and — critically — no API key. The tile
   URL is a plain image request; there is no SDK, no billing account and no
   secret to leak.

   Swap point: replace TILE_URL with a keyed provider (Google, Mapbox, Ola)
   and read the key from process.env.NEXT_PUBLIC_* at that time. Nothing else
   in this file changes.
   =========================================================================== */

export const TILE_SIZE = 256;

/** OpenStreetMap's public tiles. Attribution is required and is rendered. */
export const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export const ATTRIBUTION = '© OpenStreetMap';

/** Fractional tile coordinates — the whole-number part is the tile, the rest is the offset inside it. */
export function project(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
}

/** Midpoint of two coordinates, good enough at city scale. */
export function midpoint(a: Geo, b: Geo): { lat: number; lng: number } {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

/**
 * The largest zoom at which both points still fit inside the box, with margin.
 * Clamped to 11–16: below 11 a neighbourhood is a smudge, above 16 two points
 * a kilometre apart no longer share a screen.
 */
export function fitZoom(a: Geo, b: Geo, width: number, height: number, pad = 64): number {
  for (let z = 16; z >= 11; z--) {
    const pa = project(a.lat, a.lng, z);
    const pb = project(b.lat, b.lng, z);
    const dx = Math.abs(pa.x - pb.x) * TILE_SIZE;
    const dy = Math.abs(pa.y - pb.y) * TILE_SIZE;
    if (dx <= width - pad && dy <= height - pad) return z;
  }
  return 11;
}

/** Pixel position of a coordinate inside a box centred on `centre`. */
export function toPixel(
  lat: number, lng: number,
  centre: { lat: number; lng: number },
  z: number, width: number, height: number
): { left: number; top: number } {
  const p = project(lat, lng, z);
  const c = project(centre.lat, centre.lng, z);
  return {
    left: width / 2 + (p.x - c.x) * TILE_SIZE,
    top: height / 2 + (p.y - c.y) * TILE_SIZE,
  };
}

/** Every tile needed to cover the box, with where each one goes. */
export function tilesFor(
  centre: { lat: number; lng: number },
  z: number, width: number, height: number
): { key: string; url: string; left: number; top: number }[] {
  const c = project(centre.lat, centre.lng, z);
  const n = 2 ** z;

  /* pixel coordinate of the box's top-left corner, in world pixels */
  const originX = c.x * TILE_SIZE - width / 2;
  const originY = c.y * TILE_SIZE - height / 2;

  const firstX = Math.floor(originX / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastX = Math.floor((originX + width) / TILE_SIZE);
  const lastY = Math.floor((originY + height) / TILE_SIZE);

  const out: { key: string; url: string; left: number; top: number }[] = [];
  for (let x = firstX; x <= lastX; x++) {
    for (let y = firstY; y <= lastY; y++) {
      /* wrap horizontally at the date line; drop tiles above/below the poles */
      const tx = ((x % n) + n) % n;
      if (y < 0 || y >= n) continue;
      out.push({
        key: `${z}/${tx}/${y}`,
        url: TILE_URL(z, tx, y),
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
      });
    }
  }
  return out;
}

/**
 * How far along the journey the worker should be, 0–1.
 *
 * HONEST NAMING: this is interpolation, not telemetry. The worker's phone has
 * no channel to report its position to the customer's browser in this build,
 * so the dot the customer watches is derived from when travel started and how
 * long the trip was estimated to take. When a realtime backend exists, this
 * function is replaced by the last reported fix — nothing above it changes.
 */
export function travelProgress(startedAt: number | undefined, etaMins: number, now: number): number {
  if (!startedAt || etaMins <= 0) return 0;
  const elapsed = (now - startedAt) / 60000;
  return Math.max(0, Math.min(1, elapsed / etaMins));
}

/** Point `t` of the way from a to b. */
export function lerpGeo(a: Geo, b: Geo, t: number): { lat: number; lng: number } {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
