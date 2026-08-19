import type { LangCode } from './types';

/* ===========================================================================
   RECURRING SHIFTS
   ---------------------------------------------------------------------------
   A household books an event: "come and fix the fan". A shop or a society
   books a ROTA: "someone here every Monday, Wednesday and Friday, nine to
   eleven at night, for the next three months". Those are different objects.
   Forcing the second through the first is why a business ends up posting the
   same job forty times a month.

   A ShiftPattern is deliberately small — days of the week, a start, an end,
   and how many weeks it runs. Everything else (cost, hours, the next time
   somebody has to show up) is derived, so there is one source of truth and no
   way for the summary to disagree with the schedule.
   =========================================================================== */

export interface ShiftPattern {
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  /** minutes past midnight */
  startMin: number;
  endMin: number;
  /** how many weeks it runs; undefined means "until cancelled" */
  weeks?: number;
}

/** Sunday-first, matching Date.getDay() so no conversion is ever needed. */
export const DAY_KEYS = ['sh.sun', 'sh.mon', 'sh.tue', 'sh.wed', 'sh.thu', 'sh.fri', 'sh.sat'] as const;

/** Half-hour slots from 6am to 11:30pm — the window real shifts live in. */
export const SLOTS: number[] = Array.from({ length: 36 }, (_, i) => 360 + i * 30);

export const DEFAULT_SHIFT: ShiftPattern = { days: [1, 3, 5], startMin: 9 * 60, endMin: 11 * 60 };

/** "9:00 am". Fixed to en-IN so the label never depends on the visitor's locale. */
export function formatTime(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Hours in one shift. An end before the start means the shift crosses
 * midnight — a 10pm–1am shop closing is a normal thing to book, and treating
 * it as negative three hours would silently produce a negative invoice.
 */
export function shiftHours(p: ShiftPattern): number {
  const span = p.endMin > p.startMin ? p.endMin - p.startMin : p.endMin + 1440 - p.startMin;
  return Math.round((span / 60) * 100) / 100;
}

export function crossesMidnight(p: ShiftPattern): boolean {
  return p.endMin <= p.startMin;
}

export function hoursPerWeek(p: ShiftPattern): number {
  return Math.round(shiftHours(p) * p.days.length * 100) / 100;
}

/** Total hours over the whole booking; null when it runs until cancelled. */
export function totalHours(p: ShiftPattern): number | null {
  return p.weeks ? Math.round(hoursPerWeek(p) * p.weeks * 100) / 100 : null;
}

/**
 * Cost for one month, from an hourly rate.
 * 52 weeks / 12 months = 4.345 — using a flat 4 quietly under-bills the
 * worker by nearly a week a year.
 */
export function monthlyCost(p: ShiftPattern, hourlyRate: number, staff = 1): number {
  return Math.round(hoursPerWeek(p) * 4.345 * hourlyRate * staff);
}

/** When someone next has to turn up. */
export function nextOccurrence(p: ShiftPattern, from: number): number | null {
  if (!p.days.length) return null;
  const d = new Date(from);
  for (let i = 0; i < 8; i++) {
    const day = new Date(d.getTime() + i * 86400000);
    if (!p.days.includes(day.getDay())) continue;
    const at = new Date(day);
    at.setHours(Math.floor(p.startMin / 60), p.startMin % 60, 0, 0);
    if (at.getTime() > from) return at.getTime();
  }
  return null;
}

/** "Mon, Wed, Fri · 9:00 pm – 11:00 pm" — days in the reader's language. */
export function shiftSummary(p: ShiftPattern, t: (k: any) => string): string {
  const days = p.days.length === 7
    ? t('sh.everyDay')
    : [...p.days].sort().map((d) => t(DAY_KEYS[d])).join(', ');
  return `${days} · ${formatTime(p.startMin)} – ${formatTime(p.endMin)}`;
}

/** True when the pattern could actually be staffed. */
export function isValidShift(p: ShiftPattern): boolean {
  return p.days.length > 0 && shiftHours(p) >= 0.5 && shiftHours(p) <= 12;
}
