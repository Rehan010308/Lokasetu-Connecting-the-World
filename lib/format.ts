/**
 * Formatting. Pure functions, so `npm test` can pin them.
 */

/** ₹1,250 — Indian digit grouping, no decimals unless there are paise. */
export function rupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  const whole = Math.round(amount * 100) / 100;
  const hasPaise = Math.abs(whole % 1) > 0.001;
  return `₹${whole.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** 1.2k, 45k, 1.4L — short enough for a stat tile. */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const n = Math.abs(value);
  if (n >= 10_000_000) return `${(value / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (n >= 100_000) return `${(value / 100_000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(value));
}

/** "just now", "12m", "3h", "5d", then a date. Deliberately terse. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));

  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d`;

  const d = new Date(then);
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
}

/** "March 2024" — for "member since". */
export function monthYear(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Clamp free text to a length without cutting a word in half. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Accept "1,200", "₹1200", " 1200 " and refuse the rest. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '');
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Usernames are lowercase, letters, digits and underscore. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
