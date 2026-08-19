import type { Geo, Worker } from './types';

/* ===========================================================================
   OUTBOUND INTEGRATIONS

   Everything here is a deep link. No API keys, no billing, no server —
   it works on a real phone the moment the site is on HTTPS.

   Upgrade paths are noted per function for when you want the richer version.
   =========================================================================== */

/** Strip to digits and add the country code once. */
export function e164(phone: string, cc = '91'): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return cc + d;
  if (d.startsWith(cc)) return d;
  return d;
}

/* ------------------------------------------------------------------ calling */

/**
 * Direct dial. Works everywhere, instantly.
 *
 * UPGRADE — masked calling (the Uber model, where neither side sees the
 * other's real number): sign up with Exotel / Twilio / Knowlarity, buy a
 * virtual number, and replace this with a POST to /api/call/connect that
 * bridges the two parties. The UI calls the same function either way.
 */
export function telLink(phone: string): string {
  return `tel:+${e164(phone)}`;
}

/* ----------------------------------------------------------------- whatsapp */

/** Open a WhatsApp chat with a prefilled message. No API needed. */
export function waLink(phone: string, text: string): string {
  return `https://wa.me/${e164(phone)}?text=${encodeURIComponent(text)}`;
}

/** Share anything to whichever WhatsApp chat the user picks. */
export function waShare(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** A shareable worker card as plain text — readable even without the link. */
export function workerShareText(w: Worker, origin: string, serviceLabel: string): string {
  const verified = w.verification.status === 'verified' ? '✅ Aadhaar verified' : '';
  return [
    `${w.name} — ${serviceLabel}`,
    `${w.jobsCompleted} jobs completed${w.reviewCount ? ` · ⭐ ${w.rating.toFixed(1)} (${w.reviewCount})` : ''}`,
    verified,
    `📞 +${e164(w.phone)}`,
    `${origin}/worker/${w.id}`,
    '',
    'Found on LokaSetu',
  ].filter(Boolean).join('\n');
}

/** A job request, shared to a worker or a neighbour. */
export function jobShareText(title: string, area: string, origin: string, jobId: string): string {
  return [`Need help: ${title}`, `📍 ${area}`, `${origin}/job/${jobId}`, '', 'Posted on LokaSetu'].join('\n');
}

/* --------------------------------------------------------------------- maps */

/**
 * Turn-by-turn navigation. The universal Maps URL needs no API key and opens
 * the native app on Android and iOS.
 *
 * UPGRADE — live route drawing and a real ETA on an embedded map needs a
 * billed Google Maps JavaScript + Directions API key. Put it in
 * NEXT_PUBLIC_MAPS_KEY and render a <Map> component; keep this deep link as
 * the fallback for users who prefer their own maps app.
 */
export function navigateLink(to: Geo): string {
  const dest = to.address
    ? encodeURIComponent(`${to.address}, ${to.areaName}`)
    : `${to.lat},${to.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

/** Just show a place, without starting navigation. */
export function placeLink(at: Geo): string {
  return `https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}`;
}

/** A location pin as text, for sharing over WhatsApp or SMS. */
export function locationText(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/* ---------------------------------------------------------------------- sos */

/** India's single emergency number. Replaces 100/101/102 nationwide. */
export const EMERGENCY_NUMBER = '112';

export function emergencyCallLink(): string {
  return `tel:${EMERGENCY_NUMBER}`;
}

/**
 * The SOS message. Deliberately plain text with a maps link — it has to be
 * readable by someone glancing at a lock screen.
 */
export function sosMessage(name: string, lat?: number, lng?: number, context?: string): string {
  const lines = [
    `🆘 ${name} needs help.`,
    context ? `While: ${context}` : '',
    lat != null && lng != null ? `Location: ${locationText(lat, lng)}` : 'Location not available.',
    `Sent from LokaSetu`,
  ];
  return lines.filter(Boolean).join('\n');
}

/** Read the device's position once, for the SOS payload. */
export function getPosition(timeout = 8000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { timeout, enableHighAccuracy: true }
    );
  });
}

/** Origin that is safe to call during SSR. */
export function origin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin;
}
