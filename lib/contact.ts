/**
 * Who may see a phone number, and when.
 *
 * The rule: contact details appear only once an offer between the two people
 * has been ACCEPTED. Before that, a job shows its area and nothing sharper.
 *
 * Everything here is pure and mirrors the Row Level Security policy on
 * `private_details` in `supabase/migration-v4.3.sql`. The policy is the
 * authority — this exists so the UI can show a locked panel instead of
 * requesting something the database will refuse.
 */

import type { Offer, Profile } from './model';
import type { PrivateDetailsRow } from './database.types';

export interface ContactView {
  /** Has an offer between these two been accepted? */
  revealed: boolean;
  /** The other person in the deal. */
  person: Profile | null;
  /** True when the viewer is the worker, who also gets the street address. */
  seesAddress: boolean;
}

export function contactView(offer: Offer, viewerId: string | null): ContactView {
  const isEmployer = Boolean(viewerId) && offer.employer_id === viewerId;
  const isWorker = Boolean(viewerId) && offer.worker_id === viewerId;
  const isParty = isEmployer || isWorker;

  return {
    revealed: isParty && offer.status === 'accepted',
    person: isEmployer ? offer.worker : isWorker ? offer.employer : null,
    // The worker travels to the customer, so the worker gets the address.
    // The customer gets a name and a phone number and no reason for more.
    seesAddress: isWorker && offer.status === 'accepted',
  };
}

/** Whose private row to read for a given offer, from one side's point of view. */
export function contactOwnerId(offer: Offer, viewerId: string | null): string | null {
  if (!viewerId) return null;
  if (offer.employer_id === viewerId) return offer.worker_id;
  if (offer.worker_id === viewerId) return offer.employer_id;
  return null;
}

/** What anyone may see before acceptance: the neighbourhood, not the door. */
export function locality(profile: Profile | null | undefined): string {
  if (!profile) return '';
  return [profile.area, profile.city].filter(Boolean).join(', ') || profile.location || '';
}

/** The full address, assembled only from parts the viewer is allowed to have. */
export function fullAddress(
  profile: Profile | null | undefined,
  details: PrivateDetailsRow | null | undefined,
): string {
  return [
    details?.flat_number,
    profile?.society,
    profile?.area,
    details?.landmark ? `near ${details.landmark}` : null,
    profile?.city,
  ]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * A Google Maps search link. No SDK, no API key, no billing account — the
 * documented universal URL, which opens the Maps app on a phone and the web
 * map on a desktop.
 */
export function mapsUrl(address: string): string {
  const query = address.trim();
  if (!query) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** `tel:` for the dial button. Indian numbers keep their +91 if present. */
export function telUrl(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

/** Ten digits, or ten digits with a country code. Rejects the rest. */
export function isPhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

/** Store one canonical form so two records of the same person match. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+${digits.replace(/^\+/, '')}` : '';
}
