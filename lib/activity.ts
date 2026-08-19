import type { DB, Worker } from './types';
import { tierOf } from './tiers';

export interface Activity {
  id: string;
  icon: string;
  worker?: Worker;
  line: string;
  meta: string;
  tone: 'em' | 'cy' | 'gd' | 'in';
  badge: string;
}

const TEMPLATES: { tone: Activity['tone']; badge: string; icon: string; line: (n: string, t: string) => string }[] = [
  { tone: 'em', badge: 'Hired',     icon: '🤝', line: (n, t) => `${n} was hired for ${t} work` },
  { tone: 'cy', badge: 'Available', icon: '⚡', line: (n, t) => `${n} is free right now for ${t} work` },
  { tone: 'gd', badge: 'Completed', icon: '✅', line: (n, t) => `${n} finished ${t} work nearby` },
  { tone: 'in', badge: 'Joined',    icon: '👋', line: (n, t) => `${n} just joined — ${t} work` },
  { tone: 'em', badge: '5 stars',   icon: '⭐', line: (n) => `${n} got a 5-star review` },
];

const TRADE_WORD: Record<string, string> = {
  electrician: 'electrical', plumber: 'plumbing', carpenter: 'carpentry',
  painter: 'painting', maid: 'house', cook: 'cooking', barber: 'grooming',
  raddiwala: 'scrap', shop_assistant: 'shop', other: 'general',
};

/**
 * A deterministic activity stream derived from real records in the store.
 * Deterministic matters: the same data always produces the same feed, so the
 * screen never contradicts itself between renders, and there is no Math.random
 * in a component to break hydration.
 */
export function buildActivity(db: DB, limit = 12): Activity[] {
  const out: Activity[] = [];
  const workers = db.workers;
  if (!workers.length) return out;

  for (let i = 0; i < Math.min(limit, workers.length * 2); i++) {
    const w = workers[i % workers.length];
    const tpl = TEMPLATES[(i + w.jobsDone) % TEMPLATES.length];
    const shortName = w.name.split(' ')[0] + ' ' + (w.name.split(' ')[1]?.[0] ?? '') + '.';
    const minsAgo = 2 + ((i * 7 + w.experienceYears * 3) % 55);
    out.push({
      id: `${w.id}-${i}`,
      icon: tpl.icon,
      worker: w,
      line: tpl.line(shortName, TRADE_WORD[w.category] ?? 'local'),
      meta: `${w.geo.areaName.split(',')[0]} · ${minsAgo} min ago`,
      tone: tpl.tone,
      badge: tpl.badge,
    });
  }
  return out;
}

export function tierLabelFor(w: Worker) {
  return tierOf(w);
}
