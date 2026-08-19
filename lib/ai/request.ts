import type { CategoryId, LangCode, Urgency } from '../types';
import { matchServices, service } from '../catalog';

/**
 * WHAT THE AI STILL NEEDS TO ASK.
 * V1 guessed at timing, budget and address. V2 refuses to guess: anything it
 * cannot find in what the user said comes back in `missing`, and the posting
 * screen asks for it — in the user's own language.
 */
export type MissingField = 'service' | 'when' | 'budget' | 'where';

export interface ParsedRequest {
  category?: CategoryId;
  serviceId?: string;
  /** when several services fit, we ask instead of picking */
  candidates: string[];
  urgency: Urgency;
  estimatedHours: number;
  whenText?: string;
  budgetMin?: number;
  budgetMax?: number;
  address?: string;
  missing: MissingField[];
  confidence: number;
}

const URGENT = ['urgent', 'emergency', 'immediately', 'right now', 'asap', 'abhi', 'turant', 'तुरंत', 'अभी', 'ज़रूरी', 'जरूरी', 'உடனே', 'அவசர', 'వెంటనే', 'అత్యవసర', 'ഉടനെ', 'അടിയന്തര', 'ತಕ್ಷಣ', 'ತುರ್ತು', 'तातडीने', 'জরুরি', 'તાત્કાલિક', 'ਤੁਰੰਤ'];
const TODAY  = ['today', 'tonight', 'this evening', 'aaj', 'आज', 'இன்று', 'ఈరోజు', 'ಇಂದು', 'ഇന്ന്', 'আজ', 'આજે', 'ਅੱਜ'];
const WEEK   = ['this week', 'weekend', 'saturday', 'sunday', 'हफ्ते', 'सप्ताह', 'வாரம்', 'వారం', 'ವಾರ', 'ആഴ്ച', 'आठवड्यात', 'সপ্তাহ', 'અઠવાડિય', 'ਹਫ਼ਤੇ'];
const TOMORROW = ['tomorrow', 'kal', 'कल', 'நாளை', 'రేపు', 'ನಾಳೆ', 'നാളെ', 'উদ্যম', 'কাল', 'આવતીકાલે', 'ਕੱਲ੍ਹ'];
const TIME_RE = /\b(\d{1,2})\s*(am|pm|बजे|मणி|గంటల|ಗಂಟೆ|മണി|वाजता|টা|વાગ્યે|ਵਜੇ)\b/i;
const MORNING = ['morning', 'सुबह', 'காலை', 'ఉదయం', 'ಬೆಳಿಗ್ಗೆ', 'രാവിലെ', 'सकाळी', 'সকালে', 'સવારે', 'ਸਵੇਰੇ'];
const EVENING = ['evening', 'शाम', 'மாலை', 'సాయంత్రం', 'ಸಂಜೆ', 'വൈകുന്നേരം', 'संध्याकाळी', 'বিকেলে', 'સાંજે', 'ਸ਼ਾਮ'];
const ADDRESS_RE = /\b(flat|plot|door|house|no\.?|#|फ्लैट|मकान|ಫ್ಲ್ಯಾಟ್|ఫ్లాట్|ഫ്ലാറ്റ്|ফ্ল্যাট|ફ્લેટ|ਫਲੈਟ)\s*\.?\s*[a-z]?-?\d+/i;
const MONEY_RE = /(?:₹|rs\.?|rupees?|रुपये|ரூபாய்|రూపాయ|ರೂಪಾಯಿ|രൂപ|টাকা|રૂપિયા|ਰੁਪਏ)\s*(\d{2,6})|\b(\d{3,6})\s*(?:₹|rs\.?|rupees?|रुपये)/i;

export async function parseRequest(text: string, lang: LangCode = 'en'): Promise<ParsedRequest> {
  await new Promise((r) => setTimeout(r, 450));
  const low = text.toLowerCase();
  const missing: MissingField[] = [];

  /* ---- what work is it? ---- */
  const hits = matchServices(text);
  let serviceId: string | undefined;
  let candidates: string[] = [];
  let category: CategoryId | undefined;

  if (hits.length === 0) {
    missing.push('service');
  } else {
    category = hits[0].service.category;
    const inCat = hits.filter((h) => h.service.category === category);
    if (inCat.length === 1 || inCat[0].hits > inCat[1].hits) {
      serviceId = inCat[0].service.id;
    } else {
      // genuinely ambiguous — ask, do not pick
      candidates = inCat.slice(0, 4).map((h) => h.service.id);
      missing.push('service');
    }
  }

  /* ---- when? ---- */
  let urgency: Urgency = 'flexible';
  let whenText: string | undefined;
  if (URGENT.some((w) => low.includes(w))) { urgency = 'emergency'; whenText = 'now'; }
  else if (TODAY.some((w) => low.includes(w))) { urgency = 'today'; whenText = 'today'; }
  else if (TOMORROW.some((w) => low.includes(w))) { urgency = 'this_week'; whenText = 'tomorrow'; }
  else if (WEEK.some((w) => low.includes(w))) { urgency = 'this_week'; whenText = 'this week'; }

  const clock = text.match(TIME_RE);
  if (clock) whenText = `${whenText ? whenText + ' ' : ''}${clock[0]}`;
  else if (MORNING.some((w) => low.includes(w))) whenText = `${whenText ?? ''} morning`.trim();
  else if (EVENING.some((w) => low.includes(w))) whenText = `${whenText ?? ''} evening`.trim();

  if (!whenText) missing.push('when');

  /* ---- how much? ---- */
  let budgetMin: number | undefined;
  let budgetMax: number | undefined;
  const money = text.match(MONEY_RE);
  if (money) {
    const amount = parseInt(money[1] ?? money[2], 10);
    if (Number.isFinite(amount) && amount > 0) {
      budgetMin = Math.round(amount * 0.85);
      budgetMax = Math.round(amount * 1.15);
    }
  }
  if (budgetMin == null) missing.push('budget');

  /* ---- where? ---- */
  const addr = text.match(ADDRESS_RE);
  const address = addr ? addr[0] : undefined;
  if (!address) missing.push('where');

  const estimatedHours = serviceId ? hoursFor(serviceId, low) : 1;
  const total = hits.reduce((n, h) => n + h.hits, 0);

  return {
    category, serviceId, candidates, urgency, estimatedHours,
    whenText, budgetMin, budgetMax, address,
    missing,
    confidence: Math.min(1, total / 5),
  };
}

function hoursFor(serviceId: string, low: string): number {
  const s = service(serviceId);
  let h = s && s.hourly > 0 ? Math.max(1, Math.round(s.base / Math.max(1, s.hourly))) : 1;
  if (s?.category === 'painting') h = 6;
  if (s?.category === 'cleaning') h = 3;
  if (s?.category === 'security') h = 8;
  if (/(full|whole|entire|पूरा|முழு|పూర్తి|മുഴുവൻ|ಪೂರ್ತಿ|संपूर्ण|পুরো|આખું|ਪੂਰਾ)/.test(low)) h *= 2;
  if (/(small|minor|quick|छोटा|சிறிய|చిన్న|ചെറിയ|ಸಣ್ಣ|लहान|ছোট|નાનું|ਛੋਟਾ)/.test(low)) h = Math.max(1, Math.round(h / 2));
  return Math.min(12, h);
}
