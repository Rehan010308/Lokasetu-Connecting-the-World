import type { CategoryId, LangCode } from '../types';
import { CATEGORIES, categoryById } from './taxonomy';

export interface ExtractedProfile {
  category: CategoryId;
  skills: string[];
  experienceYears: number;
  summary: string;
  confidence: number; // 0-1
}

/**
 * AI FEATURE #1 + #2 - Voice-to-profile and skill extraction.
 *
 * PHASE 1 (now): deterministic keyword + number extraction. Zero cost, works
 * offline, good enough to demo the whole flow.
 *
 * PHASE 2 (later): replace the body with a single call to your own API route:
 *
 *   const res = await fetch('/api/extract-profile', {
 *     method: 'POST',
 *     body: JSON.stringify({ transcript, lang }),
 *   });
 *   return res.json();
 *
 * ...where the route asks Claude for JSON matching ExtractedProfile.
 * The signature never changes, so no UI code has to be touched.
 */
export async function extractWorkerProfile(
  transcript: string,
  lang: LangCode = 'en'
): Promise<ExtractedProfile> {
  await tick();
  const text = transcript.toLowerCase();

  // 1. Score every category by how many of its keywords appear.
  let bestId: CategoryId = 'other';
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (text.includes(kw.toLowerCase())) score += kw.length > 4 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = cat.id;
    }
  }

  const def = categoryById(bestId);

  // 2. Pull out skills that were actually mentioned; fall back to the
  //    common skills for the category so the profile is never empty.
  const mentioned = def.commonSkills.filter((s) => {
    const parts = s.toLowerCase().split(/[\s&]+/).filter((p) => p.length > 3);
    return parts.some((p) => text.includes(p));
  });
  const skills = mentioned.length ? mentioned : def.commonSkills.slice(0, 3);

  // 3. Years of experience.
  const experienceYears = extractYears(text);

  const summary = buildSummary(def.id, skills, experienceYears);
  const confidence = Math.min(1, bestScore / 6);

  return { category: bestId, skills, experienceYears, summary, confidence };
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twelve: 12, fifteen: 15, twenty: 20,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ஒரு': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'பத்து': 10,
  'ఒక': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'పది': 10,
  'ഒന്ന്': 1, 'രണ്ട്': 2, 'മൂന്ന്': 3, 'നാല്': 4, 'അഞ്ച്': 5, 'ആറ്': 6, 'പത്ത്': 10,
  'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಹತ್ತು': 10,
};

function extractYears(text: string): number {
  const digit = text.match(/(\d{1,2})\s*(?:\+)?\s*(years?|yrs?|saal|साल|वर्ष|ஆண்டு|வருட|సంవత్సర|ఏళ్ల|വർഷ|ವರ್ಷ)/);
  if (digit) return clampYears(parseInt(digit[1], 10));
  for (const [word, n] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`${escapeRe(word)}\\s*(years?|yrs?|saal|साल|वर्ष|ஆண்டு|வருட|సంవత్సర|ఏళ్ల|വർഷ|ವರ್ಷ)`);
    if (re.test(text)) return clampYears(n);
  }
  const bare = text.match(/\b(\d{1,2})\b/);
  if (bare) {
    const n = parseInt(bare[1], 10);
    if (n >= 1 && n <= 40) return n;
  }
  return 1;
}

function clampYears(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.min(n, 50);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSummary(cat: CategoryId, skills: string[], years: number): string {
  const def = categoryById(cat);
  const label = def.id.replace('_', ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} with ${years} year${years === 1 ? '' : 's'} of experience. Does ${skills.slice(0, 3).join(', ').toLowerCase()}.`;
}

function tick() {
  return new Promise<void>((r) => setTimeout(r, 450));
}
