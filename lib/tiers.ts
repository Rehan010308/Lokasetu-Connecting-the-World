import type { Worker } from './types';

/**
 * TRUST TIERS — the visible reputation ladder.
 *
 * Designed so a worker with no reviews still has a place to stand (Bronze is
 * earned by *showing up*, not by being rated), and so the top rung requires
 * something a person cannot buy: sustained quality across many neighbours.
 */
export type TierId = 'bronze' | 'silver' | 'gold' | 'hero';

export interface Tier {
  id: TierId;
  label: string;
  icon: string;
  /** minimum completed jobs */
  jobs: number;
  /** minimum overall rating (0 = not required) */
  rating: number;
  blurb: string;
}

export const TIERS: Tier[] = [
  { id: 'bronze', label: 'Bronze worker',  icon: '●', jobs: 0,   rating: 0,   blurb: 'Verified phone, profile complete' },
  { id: 'silver', label: 'Silver worker',  icon: '◆', jobs: 10,  rating: 4.0, blurb: '10 jobs done, 4.0+ rating' },
  { id: 'gold',   label: 'Gold worker',    icon: '★', jobs: 40,  rating: 4.5, blurb: '40 jobs done, 4.5+ rating' },
  { id: 'hero',   label: 'Community hero', icon: '✦', jobs: 120, rating: 4.7, blurb: '120 jobs done, 4.7+ rating' },
];

export function tierOf(w: Pick<Worker, 'jobsDone' | 'trust'>): Tier {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (w.jobsDone >= t.jobs && (t.rating === 0 || w.trust.overall >= t.rating)) current = t;
  }
  return current;
}

export function nextTier(w: Pick<Worker, 'jobsDone' | 'trust'>): Tier | null {
  const i = TIERS.findIndex((t) => t.id === tierOf(w).id);
  return TIERS[i + 1] ?? null;
}

/** 0–100 progress toward the next rung, so the ring always has something to fill. */
export function tierProgress(w: Pick<Worker, 'jobsDone' | 'trust'>): number {
  const cur = tierOf(w);
  const nxt = nextTier(w);
  if (!nxt) return 100;
  const jobSpan = nxt.jobs - cur.jobs;
  const jobPct = jobSpan <= 0 ? 1 : (w.jobsDone - cur.jobs) / jobSpan;
  const ratePct = nxt.rating <= 0 ? 1 : Math.min(1, w.trust.overall / nxt.rating);
  return Math.max(0, Math.min(100, Math.round(((jobPct * 0.7 + ratePct * 0.3)) * 100)));
}

/** What is still missing before the next badge — shown as a single plain line. */
export function tierGap(w: Pick<Worker, 'jobsDone' | 'trust'>): string | null {
  const nxt = nextTier(w);
  if (!nxt) return null;
  const jobsLeft = Math.max(0, nxt.jobs - w.jobsDone);
  if (jobsLeft > 0) return `${jobsLeft} more job${jobsLeft === 1 ? '' : 's'} to reach ${nxt.label}`;
  if (w.trust.overall < nxt.rating) return `Keep your rating above ${nxt.rating.toFixed(1)} to reach ${nxt.label}`;
  return `Almost at ${nxt.label}`;
}

/**
 * STREAKS — consecutive days with at least one completed job. Derived, never
 * stored, so it can never drift from reality.
 */
export function streakDays(completedAt: number[]): number {
  if (!completedAt.length) return 0;
  const days = Array.from(new Set(completedAt.map((t) => Math.floor(t / 86400000)))).sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === 1) streak++;
    else break;
  }
  return streak;
}

/** ENDORSEMENTS — peer + resident signals shown as badges on a profile. */
export const ENDORSEMENTS: { id: string; icon: string; label: string; test: (w: Worker) => boolean }[] = [
  { id: 'punctual',  icon: '⏱️', label: 'Always on time',   test: (w) => w.trust.reliability >= 4.6 && w.trust.reviewCount >= 5 },
  { id: 'clean',     icon: '✨', label: 'Leaves it clean',   test: (w) => w.trust.professionalism >= 4.6 && w.trust.reviewCount >= 5 },
  { id: 'skilled',   icon: '🛠️', label: 'Knows the work',    test: (w) => w.trust.skillQuality >= 4.7 && w.trust.reviewCount >= 5 },
  { id: 'veteran',   icon: '🎖️', label: '10+ years',         test: (w) => w.experienceYears >= 10 },
  { id: 'local',     icon: '📍', label: 'Neighbourhood regular', test: (w) => w.jobsDone >= 50 },
  { id: 'fast',      icon: '⚡', label: 'Replies fast',      test: (w) => w.availability === 'anytime' },
];

export function endorsementsFor(w: Worker) {
  return ENDORSEMENTS.filter((e) => e.test(w));
}

/** LEADERBOARD — ranked by a blend of volume and quality, scoped to an area. */
export interface LeaderRow {
  worker: Worker;
  rank: number;
  points: number;
  tier: Tier;
}

export function leaderboard(workers: Worker[], areaName?: string, limit = 10): LeaderRow[] {
  return workers
    .filter((w) => !areaName || w.geo.areaName === areaName)
    .map((w) => ({
      worker: w,
      tier: tierOf(w),
      points: Math.round(w.jobsDone * 10 + w.trust.overall * 40 + w.trust.reviewCount * 4),
      rank: 0,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Rough travel time on a two-wheeler through Indian city traffic. */
export function etaMinutes(km: number): number {
  return Math.max(4, Math.round(6 + km * 3.4));
}
