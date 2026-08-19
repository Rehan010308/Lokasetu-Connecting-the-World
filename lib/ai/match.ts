import type { Job, Worker } from '../types';
import { distanceKm } from '../geo';

export interface Match {
  worker: Worker;
  km: number;
  /** internal ordering only — never rendered as a number to the user */
  rank: number;
  /** plain-language reasons, which ARE shown */
  reasons: string[];
}

/**
 * Ordering, not scoring.
 *
 * V1 displayed a "95% match" ring. V2 removes the number: a customer choosing
 * between two neighbours does not need a fake precision, and a worker should
 * not be reduced to a percentage. The ordering logic survives; only the
 * display of it is gone.
 *
 * Order of importance: does this person do the exact service → are they
 * verified → are they close → are they free now → have they done this a lot.
 */
export function rankWorkers(
  job: Pick<Job, 'geo' | 'category' | 'serviceId'>,
  workers: Worker[],
  opts: { verifiedOnly?: boolean; availableNow?: boolean } = {}
): Match[] {
  const out: Match[] = [];

  for (const w of workers) {
    // Hard filter: a worker only ever appears under a service they actually do.
    if (job.serviceId) {
      if (!w.services.includes(job.serviceId)) continue;
    } else if (w.category !== job.category) {
      continue;
    }

    const km = distanceKm(job.geo, w.geo);
    if (km > w.radiusKm) continue;
    if (opts.verifiedOnly && w.verification.status !== 'verified') continue;
    if (opts.availableNow && w.availability !== 'anytime') continue;

    const reasons: string[] = [];
    let rank = 0;

    if (job.serviceId && w.services.includes(job.serviceId)) rank += 40;
    if (w.verification.status === 'verified') { rank += 25; reasons.push('verified'); }
    if (km <= 2) { rank += 20; reasons.push('very close'); }
    else if (km <= 5) rank += 12;
    else rank += 5;
    if (w.availability === 'anytime') { rank += 10; reasons.push('free now'); }
    rank += Math.min(15, w.jobsCompleted / 8);
    if (w.reviewCount >= 5 && w.rating >= 4.5) reasons.push('well reviewed');
    if (w.responseMins <= 10) reasons.push('replies fast');

    out.push({ worker: w, km, rank, reasons: reasons.slice(0, 3) });
  }

  return out.sort((a, b) => b.rank - a.rank);
}

/** Travel time on a two-wheeler through Indian city traffic. */
export function etaMinutes(km: number): number {
  return Math.max(4, Math.round(6 + km * 3.4));
}
