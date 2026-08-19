import type { Job } from './types';
import { amountFor } from './payments';

/* ===========================================================================
   EARNINGS
   ---------------------------------------------------------------------------
   Pure functions, no React, so the numbers a worker is shown can be tested
   rather than trusted. Money is the part of this product a worker will check
   against their own memory, and a dashboard that disagrees with their pocket
   is worse than no dashboard.

   Only COMPLETED jobs count, and only at completedAt — not when the job was
   requested or accepted. A job booked in March and finished in April is April
   earnings, because that is when the worker was paid.
   =========================================================================== */

export type RangeId = 'today' | 'd7' | 'd30' | 'd90' | 'm6' | 'y1' | 'all';

export const RANGES: { id: RangeId; key: string }[] = [
  { id: 'today', key: 'e.today' },
  { id: 'd7',    key: 'e.d7' },
  { id: 'd30',   key: 'e.d30' },
  { id: 'd90',   key: 'e.d90' },
  { id: 'm6',    key: 'e.m6' },
  { id: 'y1',    key: 'e.y1' },
  { id: 'all',   key: 'e.all' },
];

export interface Bucket {
  /** short axis label, e.g. "Mon", "12", "Apr" */
  label: string;
  from: number;
  to: number;
  amount: number;
  jobs: number;
}

export interface Summary {
  total: number;
  jobs: number;
  /** mean per completed job, 0 when there are none — never NaN */
  average: number;
  buckets: Bucket[];
  /** the biggest bucket, for the single direct label on the chart */
  best: Bucket | null;
}

const HOUR = 3600000;
const DAY = 86400000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(ms: number): number {
  const d = new Date(ms);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addMonths(ms: number, n: number): number {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + n);
  return d.getTime();
}

const DAY_NAME = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { weekday: 'short' });
const DATE_NUM = (ms: number) => String(new Date(ms).getDate());
const MONTH_NAME = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { month: 'short' });

/**
 * The time buckets a range is drawn in.
 *
 * Bucket size is chosen so a chart never has more bars than it can show: a
 * year is twelve months, not 365 days. Thirty days stays daily because a
 * worker genuinely reads it day by day.
 */
export function bucketsFor(range: RangeId, now: number, firstJobAt?: number): { from: number; to: number; label: string }[] {
  const out: { from: number; to: number; label: string }[] = [];

  if (range === 'today') {
    const start = startOfDay(now);
    for (let i = 0; i < 6; i++) {
      const from = start + i * 4 * HOUR;
      out.push({ from, to: from + 4 * HOUR, label: `${(i * 4).toString().padStart(2, '0')}` });
    }
    return out;
  }

  if (range === 'd7' || range === 'd30') {
    const n = range === 'd7' ? 7 : 30;
    const start = startOfDay(now) - (n - 1) * DAY;
    for (let i = 0; i < n; i++) {
      const from = start + i * DAY;
      out.push({ from, to: from + DAY, label: n === 7 ? DAY_NAME(from) : DATE_NUM(from) });
    }
    return out;
  }

  if (range === 'd90') {
    /* weekly — 13 bars reads; 90 does not */
    const start = startOfDay(now) - 89 * DAY;
    for (let i = 0; i < 13; i++) {
      const from = start + i * 7 * DAY;
      out.push({ from, to: from + 7 * DAY, label: DATE_NUM(from) });
    }
    return out;
  }

  const months = range === 'm6' ? 6 : range === 'y1' ? 12 : monthsSince(firstJobAt ?? now, now);
  const first = startOfMonth(addMonths(now, -(months - 1)));
  for (let i = 0; i < months; i++) {
    const from = addMonths(first, i);
    out.push({ from, to: addMonths(first, i + 1), label: MONTH_NAME(from) });
  }
  return out;
}

/** Whole months covered, clamped so "lifetime" cannot draw 400 bars. */
function monthsSince(from: number, now: number): number {
  const a = new Date(from), b = new Date(now);
  const n = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  return Math.max(1, Math.min(24, n));
}

/** Completed, paid work for one worker — the only thing that counts as earnings. */
export function earnedJobs(jobs: Job[], workerId: string): Job[] {
  return jobs.filter((j) => j.assignedWorkerId === workerId && j.status === 'completed' && j.completedAt);
}

export function summarise(jobs: Job[], workerId: string, range: RangeId, now: number): Summary {
  const mine = earnedJobs(jobs, workerId);
  const firstAt = mine.length ? Math.min(...mine.map((j) => j.completedAt!)) : now;
  const spans = bucketsFor(range, now, firstAt);

  const buckets: Bucket[] = spans.map((s) => {
    const inSpan = mine.filter((j) => j.completedAt! >= s.from && j.completedAt! < s.to);
    return {
      ...s,
      amount: inSpan.reduce((sum, j) => sum + amountFor(j), 0),
      jobs: inSpan.length,
    };
  });

  const total = buckets.reduce((sum, b) => sum + b.amount, 0);
  const count = buckets.reduce((sum, b) => sum + b.jobs, 0);
  const best = buckets.reduce<Bucket | null>((b, x) => (x.amount > (b?.amount ?? 0) ? x : b), null);

  return {
    total,
    jobs: count,
    average: count ? Math.round(total / count) : 0,
    buckets,
    best: best && best.amount > 0 ? best : null,
  };
}

/** Lifetime total, ignoring any range. */
export function lifetime(jobs: Job[], workerId: string): { total: number; jobs: number } {
  const mine = earnedJobs(jobs, workerId);
  return { total: mine.reduce((s, j) => s + amountFor(j), 0), jobs: mine.length };
}

/** The best calendar month ever, for the "highest earning month" tile. */
export function bestMonth(jobs: Job[], workerId: string): { label: string; amount: number } | null {
  const mine = earnedJobs(jobs, workerId);
  if (!mine.length) return null;
  const byMonth = new Map<number, number>();
  for (const j of mine) {
    const k = startOfMonth(j.completedAt!);
    byMonth.set(k, (byMonth.get(k) ?? 0) + amountFor(j));
  }
  const [ms, amount] = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];
  return { label: new Date(ms).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), amount };
}

/** ₹12,400 → "12.4K" for an axis tick that must not wrap. */
export function compact(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

/** Clean axis ceiling: 0 / 1,000 / 2,000 rather than 0 / 937 / 1,874. */
export function niceMax(v: number): number {
  if (v <= 0) return 100;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (v <= step * mag) return step * mag;
  }
  return 10 * mag;
}
