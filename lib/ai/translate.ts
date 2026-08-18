import type { LangCode } from '../types';

type Row = Record<LangCode, string>;

/**
 * AI FEATURE #4 - Multilingual chat.
 *
 * PHASE 1: a curated phrase book of the ~24 things people actually say while
 * arranging a small local job, in all six languages. The chat screen offers
 * these as one-tap chips, so a worker who cannot type still holds a full
 * conversation and the resident reads it in their own language.
 *
 * PHASE 2: replace translateText's body with a POST to /api/translate that
 * calls Claude. Keep the phrase book as a zero-latency cache in front of it.
 */
export const PHRASES: Row[] = [
  { en: 'I can come now',            hi: 'मैं अभी आ सकता हूँ',           ta: 'நான் இப்போது வர முடியும்',      te: 'నేను ఇప్పుడు రాగలను',        ml: 'എനിക്ക് ഇപ്പോൾ വരാം',        kn: 'ನಾನು ಈಗ ಬರಬಹುದು' },
  { en: 'I will come in 30 minutes', hi: 'मैं 30 मिनट में आऊँगा',        ta: '30 நிமிடத்தில் வருகிறேன்',      te: '30 నిమిషాల్లో వస్తాను',      ml: '30 മിനിറ്റിൽ വരാം',          kn: '30 ನಿಮಿಷದಲ್ಲಿ ಬರುತ್ತೇನೆ' },
  { en: 'I will come tomorrow',      hi: 'मैं कल आऊँगा',                 ta: 'நாளை வருகிறேன்',                te: 'రేపు వస్తాను',               ml: 'നാളെ വരാം',                  kn: 'ನಾಳೆ ಬರುತ್ತೇನೆ' },
  { en: 'What is your address?',     hi: 'आपका पता क्या है?',            ta: 'உங்கள் முகவரி என்ன?',           te: 'మీ చిరునామా ఏమిటి?',         ml: 'നിങ്ങളുടെ വിലാസം എന്താണ്?',  kn: 'ನಿಮ್ಮ ವಿಳಾಸ ಏನು?' },
  { en: 'Please share your address', hi: 'कृपया अपना पता भेजें',         ta: 'உங்கள் முகவரியை அனுப்புங்கள்',  te: 'మీ చిరునామా పంపండి',         ml: 'വിലാസം അയയ്ക്കൂ',            kn: 'ನಿಮ್ಮ ವಿಳಾಸ ಕಳುಹಿಸಿ' },
  { en: 'Which floor?',              hi: 'कौन सी मंज़िल?',               ta: 'எந்த மாடி?',                    te: 'ఏ అంతస్తు?',                 ml: 'ഏത് നിലയാണ്?',               kn: 'ಯಾವ ಮಹಡಿ?' },
  { en: 'I am at the gate',          hi: 'मैं गेट पर हूँ',               ta: 'நான் வாசலில் இருக்கிறேன்',      te: 'నేను గేటు దగ్గర ఉన్నాను',    ml: 'ഞാൻ ഗേറ്റിലുണ്ട്',           kn: 'ನಾನು ಗೇಟಿನ ಬಳಿ ಇದ್ದೇನೆ' },
  { en: 'Please come at 10 am',      hi: 'कृपया सुबह 10 बजे आइए',        ta: 'காலை 10 மணிக்கு வாருங்கள்',     te: 'ఉదయం 10 గంటలకు రండి',        ml: 'രാവിലെ 10 മണിക്ക് വരൂ',      kn: 'ಬೆಳಿಗ್ಗೆ 10 ಗಂಟೆಗೆ ಬನ್ನಿ' },
  { en: 'Please come in the evening',hi: 'कृपया शाम को आइए',             ta: 'மாலையில் வாருங்கள்',            te: 'సాయంత్రం రండి',              ml: 'വൈകുന്നേരം വരൂ',             kn: 'ಸಂಜೆ ಬನ್ನಿ' },
  { en: 'How much will it cost?',    hi: 'कितना खर्च आएगा?',             ta: 'எவ்வளவு செலவாகும்?',            te: 'ఎంత ఖర్చు అవుతుంది?',        ml: 'എത്ര ചെലവാകും?',             kn: 'ಎಷ್ಟು ಖರ್ಚಾಗುತ್ತದೆ?' },
  { en: 'The price is fine',         hi: 'दाम ठीक है',                   ta: 'விலை சரி',                      te: 'ధర సరిపోతుంది',              ml: 'വില കുഴപ്പമില്ല',            kn: 'ದರ ಸರಿ ಇದೆ' },
  { en: 'Can you reduce the price?', hi: 'क्या दाम कम कर सकते हैं?',     ta: 'விலையை குறைக்க முடியுமா?',      te: 'ధర తగ్గించగలరా?',            ml: 'വില കുറയ്ക്കാമോ?',           kn: 'ದರ ಕಡಿಮೆ ಮಾಡಬಹುದೇ?' },
  { en: 'I need spare parts',        hi: 'मुझे सामान चाहिए होगा',        ta: 'உதிரி பாகங்கள் தேவை',           te: 'విడిభాగాలు కావాలి',          ml: 'സ്പെയർ പാർട്സ് വേണം',        kn: 'ಬಿಡಿ ಭಾಗಗಳು ಬೇಕು' },
  { en: 'Parts cost is extra',       hi: 'सामान का खर्च अलग है',         ta: 'பொருட்கள் கட்டணம் தனி',         te: 'సామాను ఖర్చు వేరు',          ml: 'സാധനങ്ങളുടെ വില വേറെ',       kn: 'ಸಾಮಗ್ರಿ ವೆಚ್ಚ ಪ್ರತ್ಯೇಕ' },
  { en: 'Work is finished',          hi: 'काम पूरा हो गया',              ta: 'வேலை முடிந்தது',                te: 'పని పూర్తయింది',             ml: 'ജോലി കഴിഞ്ഞു',               kn: 'ಕೆಲಸ ಮುಗಿಯಿತು' },
  { en: 'Thank you',                 hi: 'धन्यवाद',                      ta: 'நன்றி',                         te: 'ధన్యవాదాలు',                 ml: 'നന്ദി',                      kn: 'ಧನ್ಯವಾದಗಳು' },
  { en: 'Okay',                      hi: 'ठीक है',                       ta: 'சரி',                           te: 'సరే',                        ml: 'ശരി',                        kn: 'ಸರಿ' },
  { en: 'Yes',                       hi: 'हाँ',                          ta: 'ஆம்',                           te: 'అవును',                      ml: 'അതെ',                        kn: 'ಹೌದು' },
  { en: 'No',                        hi: 'नहीं',                         ta: 'இல்லை',                         te: 'కాదు',                       ml: 'അല്ല',                       kn: 'ಇಲ್ಲ' },
  { en: 'Sorry, I am busy today',    hi: 'माफ़ कीजिए, आज व्यस्त हूँ',    ta: 'மன்னிக்கவும், இன்று பிஸி',      te: 'క్షమించండి, ఈరోజు బిజీ',     ml: 'ക്ഷമിക്കണം, ഇന്ന് തിരക്കാണ്', kn: 'ಕ್ಷಮಿಸಿ, ಇಂದು ಬಿಡುವಿಲ್ಲ' },
  { en: 'Please call me',            hi: 'मुझे कॉल कीजिए',               ta: 'எனக்கு அழையுங்கள்',             te: 'నాకు కాల్ చేయండి',           ml: 'എന്നെ വിളിക്കൂ',             kn: 'ನನಗೆ ಕರೆ ಮಾಡಿ' },
  { en: 'I will pay by UPI',         hi: 'मैं UPI से भुगतान करूँगा',     ta: 'UPI மூலம் பணம் தருகிறேன்',      te: 'UPI ద్వారా చెల్లిస్తాను',    ml: 'UPI വഴി പണം നൽകാം',          kn: 'UPI ಮೂಲಕ ಪಾವತಿಸುತ್ತೇನೆ' },
  { en: 'I will pay cash',           hi: 'मैं नकद दूँगा',                ta: 'ரொக்கமாக தருகிறேன்',            te: 'నగదు ఇస్తాను',               ml: 'പണമായി തരാം',                kn: 'ನಗದು ಕೊಡುತ್ತೇನೆ' },
  { en: 'See you soon',              hi: 'जल्दी मिलते हैं',              ta: 'விரைவில் சந்திப்போம்',          te: 'త్వరలో కలుద్దాం',            ml: 'ഉടൻ കാണാം',                  kn: 'ಶೀಘ್ರದಲ್ಲಿ ಸಿಗೋಣ' },
];

export interface Translation {
  text: string;
  translated: boolean;
}

const norm = (s: string) =>
  s.trim().toLowerCase().replace(/[.?!,;:]+$/g, '').replace(/\s+/g, ' ');

/**
 * Translate one chat message. Returns translated=false when we could not do it,
 * so the UI can show the original honestly instead of faking a translation.
 */
export async function translateText(
  text: string,
  from: LangCode,
  to: LangCode
): Promise<Translation> {
  if (from === to) return { text, translated: false };
  await new Promise((r) => setTimeout(r, 120));

  const target = norm(text);
  for (const row of PHRASES) {
    if (norm(row[from]) === target) {
      return { text: row[to], translated: true };
    }
  }
  // Try any language column - people mix languages constantly.
  for (const row of PHRASES) {
    for (const code of Object.keys(row) as LangCode[]) {
      if (norm(row[code]) === target) return { text: row[to], translated: true };
    }
  }
  return { text, translated: false };
}

/** One-tap phrases for the chat screen, rendered in the sender's language. */
export function quickPhrases(lang: LangCode): string[] {
  return PHRASES.map((p) => p[lang]);
}
