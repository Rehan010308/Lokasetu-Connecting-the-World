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
    /* HARD TRADE FILTER — both halves matter.
       A worker only ever appears under a service they actually listed, AND
       only ever inside their own category. Checking the service alone was
       already enough in practice, but the category check makes the rule
       impossible to break by adding a service id to the wrong category in the
       catalogue later. An electrician cannot be shown a cooking job by any
       route through this function. */
    if (w.category !== job.category) continue;
    if (job.serviceId && !w.services.includes(job.serviceId)) continue;

    /* Different city, different marketplace. Radius alone nearly always
       catches this, but an explicit check means a locality that happens to sit
       near a boundary can never leak a worker who cannot realistically come. */
    if (job.geo.cityId && w.geo.cityId && job.geo.cityId !== w.geo.cityId) continue;

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
