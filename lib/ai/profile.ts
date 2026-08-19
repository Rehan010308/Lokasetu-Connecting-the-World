import type { CategoryId, LangCode } from '../types';
import { matchServices, service, servicesOf } from '../catalog';
import { serviceName } from '../i18n-catalog';

export interface ExtractedProfile {
  category: CategoryId;
  /** service ids — what search actually filters on */
  services: string[];
  experienceYears: number;
  /** AI-written bio, in the worker's own language */
  bio: string;
  confidence: number;
}

/**
 * AI PORTFOLIO CREATION — speech in, professional profile out.
 *
 * The worker never writes a resume. They talk; this turns it into a category,
 * a set of concrete services, years of experience and a readable bio.
 *
 * PHASE 2: replace the body with `fetch('/api/extract-profile')` which asks
 * Claude for JSON in this exact shape. Nothing upstream changes.
 */
export async function extractWorkerProfile(
  transcript: string,
  lang: LangCode = 'en'
): Promise<ExtractedProfile> {
  await new Promise((r) => setTimeout(r, 500));

  const hits = matchServices(transcript);
  const years = extractYears(transcript);

  if (!hits.length) {
    return {
      category: 'maintenance',
      services: [],
      experienceYears: years,
      bio: buildBio([], years, lang),
      confidence: 0,
    };
  }

  // The category is whichever one the worker's words point at most.
  const byCategory = new Map<CategoryId, number>();
  for (const h of hits) {
    byCategory.set(h.service.category, (byCategory.get(h.service.category) ?? 0) + h.hits);
  }
  const category = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // Only services inside that category — this is what stops a plumber
  // showing up under Painting because they said the word "wall".
  const picked = hits.filter((h) => h.service.category === category).map((h) => h.service.id);
  const services = picked.length ? picked.slice(0, 5) : servicesOf(category).slice(0, 3).map((s) => s.id);

  const total = hits.reduce((n, h) => n + h.hits, 0);
  return {
    category,
    services,
    experienceYears: years,
    bio: buildBio(services, years, lang),
    confidence: Math.min(1, total / 6),
  };
}

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ஒரு': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6, 'ஏழு': 7, 'பத்து': 10,
  'ఒక': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'పది': 10,
  'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಹತ್ತು': 10,
  'ഒന്ന്': 1, 'രണ്ട്': 2, 'മൂന്ന്': 3, 'നാല്': 4, 'അഞ്ച്': 5, 'ആറ്': 6, 'പത്ത്': 10,
  'एका': 1, 'दोन': 2, 'तीन ': 3, 'चार ': 4, 'पाच': 5, 'सहा': 6, 'दहा': 10,
  'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5, 'ছয়': 6, 'দশ': 10,
  'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'દસ': 10,
  'ਇੱਕ': 1, 'ਦੋ': 2, 'ਤਿੰਨ': 3, 'ਚਾਰ': 4, 'ਪੰਜ': 5, 'ਛੇ': 6, 'ਦਸ': 10,
};

const YEAR_WORDS = 'years?|yrs?|saal|साल|वर्ष|ஆண்டு|வருட|సంవత్సర|ఏళ్ల|വർഷ|ವರ್ಷ|वर्षे|বছর|વર્ષ|ਸਾਲ';

function extractYears(text: string): number {
  const low = text.toLowerCase();
  const digit = low.match(new RegExp(`(\\d{1,2})\\s*\\+?\\s*(?:${YEAR_WORDS})`));
  if (digit) return clamp(parseInt(digit[1], 10));
  for (const [word, n] of Object.entries(NUM_WORDS)) {
    if (new RegExp(`${esc(word)}\\s*(?:${YEAR_WORDS})`).test(low)) return clamp(n);
  }
  const bare = low.match(/\b(\d{1,2})\b/);
  if (bare) {
    const n = parseInt(bare[1], 10);
    if (n >= 1 && n <= 45) return n;
  }
  return 1;
}

const clamp = (n: number) => (!Number.isFinite(n) || n < 1 ? 1 : Math.min(n, 50));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A short bio in the worker's own language, built from what they said. */
function buildBio(services: string[], years: number, lang: LangCode): string {
  const names = services.slice(0, 3).map((s) => serviceName(s, lang));
  const list = names.join(', ');
  const tmpl: Record<LangCode, (l: string, y: number) => string> = {
    en: (l, y) => `Does ${l.toLowerCase()}. ${y} years of experience.`,
    hi: (l, y) => `${l} का काम करते हैं। ${y} साल का अनुभव।`,
    ta: (l, y) => `${l} செய்கிறார். ${y} வருட அனுபவம்.`,
    te: (l, y) => `${l} చేస్తారు. ${y} సంవత్సరాల అనుభవం.`,
    kn: (l, y) => `${l} ಮಾಡುತ್ತಾರೆ. ${y} ವರ್ಷಗಳ ಅನುಭವ.`,
    ml: (l, y) => `${l} ചെയ്യുന്നു. ${y} വർഷത്തെ പരിചയം.`,
    mr: (l, y) => `${l} चे काम करतात. ${y} वर्षांचा अनुभव.`,
    bn: (l, y) => `${l} করেন। ${y} বছরের অভিজ্ঞতা।`,
    gu: (l, y) => `${l} નું કામ કરે છે. ${y} વર્ષનો અનુભવ.`,
    pa: (l, y) => `${l} ਦਾ ਕੰਮ ਕਰਦੇ ਹਨ। ${y} ਸਾਲ ਦਾ ਤਜਰਬਾ।`,
  };
  return tmpl[lang](list || '—', years);
}
