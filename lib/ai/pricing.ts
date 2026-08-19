import type { Urgency } from '../types';
import { service } from '../catalog';

export interface PriceSuggestion { min: number; max: number; basis: string }

const URGENCY_MULT: Record<Urgency, number> = {
  emergency: 1.4, today: 1.15, this_week: 1.0, flexible: 0.95,
};

/**
 * A transparent rate card, not a black box. Every number on screen can be
 * traced to a line in lib/catalog.ts, which matters when a worker asks why
 * the app suggested what it did.
 */
export async function suggestPrice(
  serviceId: string | undefined,
  urgency: Urgency,
  hours: number,
  localAverage?: number
): Promise<PriceSuggestion> {
  const s = serviceId ? service(serviceId) : undefined;
  const base = s?.base ?? 300;
  const hourly = s?.hourly ?? 220;
  const h = Math.max(1, hours);

  let mid = base + hourly * (h - 1);
  mid *= URGENCY_MULT[urgency];
  if (localAverage && localAverage > 0) mid = mid * 0.6 + localAverage * 0.4;

  const bits = [
    'standard rate',
    `${h} hour${h === 1 ? '' : 's'}`,
    urgency === 'emergency' ? 'emergency call-out' : urgency === 'today' ? 'same day' : 'no rush',
  ];
  if (localAverage) bits.push('recent local jobs');

  return { min: round(mid * 0.85), max: round(mid * 1.2), basis: bits.join(' · ') };
}

const round = (n: number) => Math.max(10, Math.round(n / 10) * 10);
