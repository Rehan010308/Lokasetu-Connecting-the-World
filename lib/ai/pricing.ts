import type { CategoryId, Urgency } from '../types';
import { categoryById } from './taxonomy';

export interface PriceSuggestion {
  min: number;
  max: number;
  basis: string;
}

const URGENCY_MULTIPLIER: Record<Urgency, number> = {
  emergency: 1.4,
  today: 1.15,
  this_week: 1.0,
  flexible: 0.95,
};

/**
 * AI FEATURE #6 - Unified / fair pricing.
 * Phase 1 uses a transparent rate card. Phase 2 can feed real completed-job
 * history into Claude and ask for a calibrated range - same return shape.
 */
export async function suggestPrice(
  category: CategoryId,
  urgency: Urgency,
  estimatedHours: number,
  historyAverage?: number
): Promise<PriceSuggestion> {
  const def = categoryById(category);
  const hours = Math.max(1, estimatedHours);
  let mid = def.baseRate + def.hourlyRate * (hours - 1);
  mid *= URGENCY_MULTIPLIER[urgency];

  // Blend in what similar jobs actually settled at, when we have that data.
  if (historyAverage && historyAverage > 0) {
    mid = mid * 0.6 + historyAverage * 0.4;
  }

  const min = roundTo(mid * 0.85, 10);
  const max = roundTo(mid * 1.2, 10);

  const bits = [
    `${def.id.replace('_', ' ')} base rate`,
    `${hours} hour${hours === 1 ? '' : 's'} of work`,
    urgency === 'emergency'
      ? 'emergency call-out'
      : urgency === 'today'
      ? 'same-day visit'
      : 'no rush',
  ];
  if (historyAverage) bits.push('recent local jobs');

  return { min, max, basis: bits.join(' • ') };
}

function roundTo(n: number, step: number) {
  return Math.max(step, Math.round(n / step) * step);
}
