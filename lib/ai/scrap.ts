import type { ScrapItem } from '../types';

export interface ScrapResult {
  items: ScrapItem[];
  totalValue: number;
  note: string;
}

/** Live-ish Indian scrap rates (INR per kg). Update from a rates feed later. */
export const SCRAP_RATES: Record<string, number> = {
  Newspaper: 14,
  Cardboard: 8,
  'Mixed paper': 10,
  Plastic: 12,
  'Glass bottles': 2,
  Iron: 28,
  Aluminium: 105,
  Copper: 520,
  'E-waste': 45,
};

/**
 * AI FEATURE #8 - Scrap material recognition.
 *
 * PHASE 1: we cannot see the photo, so we derive a plausible, stable result
 * from the file itself (its name and size) - the same photo always gives the
 * same answer, which keeps demos honest and repeatable.
 *
 * PHASE 2: send the image to /api/identify-scrap, which passes it to Claude's
 * vision API and asks for JSON matching ScrapResult. Nothing else changes.
 */
export async function identifyScrap(file: { name: string; size: number }): Promise<ScrapResult> {
  await new Promise((r) => setTimeout(r, 900));

  const name = file.name.toLowerCase();
  const picked: string[] = [];

  const hint: [string, string][] = [
    ['paper', 'Newspaper'], ['news', 'Newspaper'], ['raddi', 'Newspaper'],
    ['box', 'Cardboard'], ['carton', 'Cardboard'], ['cardboard', 'Cardboard'],
    ['bottle', 'Plastic'], ['plastic', 'Plastic'],
    ['iron', 'Iron'], ['metal', 'Iron'], ['steel', 'Iron'],
    ['copper', 'Copper'], ['wire', 'Copper'],
    ['laptop', 'E-waste'], ['tv', 'E-waste'], ['phone', 'E-waste'], ['电', 'E-waste'],
    ['glass', 'Glass bottles'],
  ];
  for (const [needle, material] of hint) {
    if (name.includes(needle) && !picked.includes(material)) picked.push(material);
  }

  if (!picked.length) {
    // Deterministic pseudo-detection driven by file size.
    const pool = ['Newspaper', 'Cardboard', 'Plastic', 'Iron', 'E-waste'];
    const seed = file.size % pool.length;
    picked.push(pool[seed], pool[(seed + 2) % pool.length]);
  }

  const items: ScrapItem[] = picked.slice(0, 3).map((material, i) => {
    const approxKg = Math.max(1, Math.round(((file.size / 1024 / 200) + i * 2) % 18) + 2);
    return { material, approxKg, ratePerKg: SCRAP_RATES[material] ?? 10 };
  });

  const totalValue = items.reduce((s, it) => s + it.approxKg * it.ratePerKg, 0);

  return {
    items,
    totalValue,
    note: 'Final weight and price are confirmed by the collector at your door.',
  };
}
