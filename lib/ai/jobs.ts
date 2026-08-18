import type { CategoryId, LangCode, Urgency } from '../types';
import { CATEGORIES, categoryById } from './taxonomy';

export interface ParsedJob {
  title: string;
  category: CategoryId;
  skills: string[];
  urgency: Urgency;
  estimatedHours: number;
  confidence: number;
}

const URGENT_WORDS = [
  'urgent', 'emergency', 'immediately', 'right now', 'asap', 'abhi', 'turant',
  'तुरंत', 'अभी', 'जरूरी', 'உடனே', 'அவசர', 'వెంటనే', 'అత్యవసర', 'ഉടനെ', 'അടിയന്തര', 'ತಕ್ಷಣ', 'ತುರ್ತು',
];
const TODAY_WORDS = ['today', 'tonight', 'evening', 'morning', 'aaj', 'आज', 'இன்று', 'ఈరోజు', 'ഇന്ന്', 'ಇಂದು'];
const WEEK_WORDS = ['this week', 'week', 'weekend', 'saturday', 'sunday', 'हफ्ते', 'सप्ताह', 'வாரம்', 'వారం', 'ആഴ്ച', 'ವಾರ'];

/**
 * AI FEATURE #3 - Understand a resident's request (typed or spoken).
 * Phase 2: swap the body for a call to /api/parse-job which asks Claude for
 * JSON matching ParsedJob. Signature is unchanged.
 */
export async function parseJobRequest(
  request: string,
  lang: LangCode = 'en'
): Promise<ParsedJob> {
  await tick();
  const text = request.toLowerCase();

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
  const skills = def.commonSkills.filter((s) => {
    const parts = s.toLowerCase().split(/[\s&]+/).filter((p) => p.length > 3);
    return parts.some((p) => text.includes(p));
  });

  let urgency: Urgency = 'flexible';
  if (URGENT_WORDS.some((w) => text.includes(w))) urgency = 'emergency';
  else if (TODAY_WORDS.some((w) => text.includes(w))) urgency = 'today';
  else if (WEEK_WORDS.some((w) => text.includes(w))) urgency = 'this_week';

  const estimatedHours = estimateHours(bestId, text);
  const title = makeTitle(request, def.id);

  return {
    title,
    category: bestId,
    skills: skills.length ? skills : def.commonSkills.slice(0, 2),
    urgency,
    estimatedHours,
    confidence: Math.min(1, bestScore / 5),
  };
}

function estimateHours(cat: CategoryId, text: string): number {
  const base: Partial<Record<CategoryId, number>> = {
    electrician: 1, plumber: 1, carpenter: 2, painter: 6,
    maid: 2, cook: 2, barber: 1, raddiwala: 1, shop_assistant: 8,
  };
  let h = base[cat] ?? 2;
  if (/(full|whole|entire|पूरा|முழு|పూర్తి|മുഴുവൻ|ಪೂರ್ತಿ)/.test(text)) h *= 2;
  if (/(small|minor|quick|छोटा|சிறிய|చిన్న|ചെറിയ|ಸಣ್ಣ)/.test(text)) h = Math.max(1, Math.round(h / 2));
  return h;
}

function makeTitle(request: string, cat: CategoryId): string {
  const clean = request.trim().replace(/\s+/g, ' ');
  if (clean.length <= 60) return capitalize(clean);
  return capitalize(clean.slice(0, 57)) + '...';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function tick() {
  return new Promise<void>((r) => setTimeout(r, 450));
}
