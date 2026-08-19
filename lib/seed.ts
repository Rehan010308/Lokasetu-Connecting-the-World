import type { Client, DB, Job, Review, Worker } from './types';
import { AREAS } from './geo';

const T = 1735689600000; // fixed epoch so server and client render identically
const day = 86400000;

const ver = (last4: string, name: string) =>
  ({ status: 'verified' as const, idLast4: last4, idName: name, method: 'simulated' as const, checkedAt: T - 30 * day });

function w(
  id: string, name: string, phone: string, lang: Worker['lang'], languages: Worker['languages'],
  category: Worker['category'], services: string[], years: number, area: number,
  radius: number, avail: Worker['availability'], jobs: number, rating: number, reviews: number,
  respond: number, verification: Worker['verification'], speech: string, bio: string
): Worker {
  return {
    id, name, phone, lang, languages, category, services,
    experienceYears: years, rawSpeech: speech, bio,
    geo: AREAS[area], radiusKm: radius, availability: avail,
    jobsCompleted: jobs, rating, reviewCount: reviews, responseMins: respond,
    verification, emergencyContact: '9000000099', createdAt: T - 200 * day,
  };
}

const workers: Worker[] = [
  /* ---- DEMO ACCOUNT ---- */
  w('w_demo', 'Ramesh Kumar', '9000000001', 'hi', ['hi', 'en'], 'electrical',
    ['fan_repair', 'wiring', 'inverter', 'switchboard'], 6, 0, 5, 'anytime', 47, 4.8, 31, 6,
    ver('4821', 'Ramesh Kumar'),
    'मैं बिजली की वायरिंग, पंखा लगाना और इन्वर्टर ठीक करता हूँ, छह साल का अनुभव है',
    'पंखा ठीक करना, वायरिंग, इन्वर्टर मरम्मत का काम करते हैं। 6 साल का अनुभव।'),

  w('w2', 'Suresh Patil', '9876500002', 'kn', ['kn', 'hi'], 'electrical',
    ['switchboard', 'lighting', 'geyser'], 3, 1, 10, 'weekdays', 18, 4.2, 12, 22,
    ver('7710', 'Suresh Patil'),
    'ನಾನು ಸ್ವಿಚ್ ಬೋರ್ಡ್, ಲೈಟ್ ಮತ್ತು ಗೀಸರ್ ಕೆಲಸ ಮಾಡುತ್ತೇನೆ',
    'ಸ್ವಿಚ್ ಮತ್ತು ಸಾಕೆಟ್, ಲೈಟ್ ಮತ್ತು ಬಲ್ಬ್, ಗೀಸರ್ ಅಳವಡಿಕೆ ಮಾಡುತ್ತಾರೆ. 3 ವರ್ಷಗಳ ಅನುಭವ.'),

  w('w3', 'Murugan S', '9876500003', 'ta', ['ta', 'en'], 'plumbing',
    ['leak_repair', 'tap_fitting', 'tank_motor', 'pipe_work'], 9, 0, 5, 'anytime', 88, 4.9, 54, 4,
    ver('3092', 'Murugan Selvam'),
    'நான் கசிவு பழுது, குழாய் பொருத்துதல், மோட்டார் வேலை செய்கிறேன்',
    'கசிவு பழுது, குழாய் பொருத்துதல், தொட்டி மற்றும் மோட்டார் செய்கிறார். 9 வருட அனுபவம்.'),

  w('w4', 'Anil Yadav', '9876500004', 'hi', ['hi'], 'plumbing',
    ['drain_clean', 'toilet_repair', 'pipe_work'], 4, 3, 10, 'anytime', 25, 4.0, 15, 14,
    { status: 'pending', method: 'simulated', checkedAt: T - 2 * day },
    'नाली साफ करना, टॉयलेट रिपेयर, पाइप लाइन का काम',
    'नाली सफाई, शौचालय मरम्मत, पाइप का काम करते हैं। 4 साल का अनुभव।'),

  w('w5', 'Lakshmi Devi', '9876500005', 'te', ['te', 'hi'], 'domestic',
    ['maid', 'cook'], 7, 0, 2, 'weekdays', 132, 4.7, 61, 9,
    ver('5540', 'Lakshmi Devi'),
    'నేను ఇల్లు ఊడ్చడం, పాత్రలు కడగడం, వంట చేస్తాను',
    'ఇంటి పనిమనిషి, వంటవారు పని చేస్తారు. 7 సంవత్సరాల అనుభవం.'),

  w('w6', 'Sunita Bai', '9876500006', 'mr', ['mr', 'hi'], 'cleaning',
    ['home_cleaning', 'bathroom_clean', 'deep_cleaning'], 2, 1, 5, 'anytime', 9, 4.3, 6, 11,
    ver('8834', 'Sunita Bai'),
    'झाडू पोछा, बाथरूम सफाई, डीप क्लीनिंग करते',
    'घराची स्वच्छता, स्नानगृह सफाई, सखोल स्वच्छता करतात. 2 वर्षांचा अनुभव.'),

  w('w7', 'Joseph Mathew', '9876500007', 'ml', ['ml', 'en'], 'carpentry',
    ['door_repair', 'cupboard', 'furniture'], 12, 2, 10, 'weekdays', 156, 4.6, 73, 18,
    ver('2261', 'Joseph Mathew'),
    'ഞാൻ വാതിൽ പണി, അലമാര ഫിറ്റിംഗ്, ഫർണിച്ചർ ചെയ്യും',
    'വാതിൽ റിപ്പയർ, അലമാര ഘടിപ്പിക്കൽ, ഫർണിച്ചർ ജോലി ചെയ്യുന്നു. 12 വർഷത്തെ പരിചയം.'),

  w('w8', 'Ravi Shankar', '9876500008', 'kn', ['kn', 'te'], 'painting',
    ['interior_paint', 'putty_primer', 'wood_polish'], 8, 4, 10, 'anytime', 41, 4.4, 27, 25,
    ver('9107', 'Ravi Shankar'),
    'ಒಳಾಂಗಣ ಪೇಂಟಿಂಗ್, ಪುಟ್ಟಿ ಪ್ರೈಮರ್, ಪಾಲಿಶ್ ಕೆಲಸ',
    'ಒಳಾಂಗಣ ಬಣ್ಣ, ಪುಟ್ಟಿ ಮತ್ತು ಪ್ರೈಮರ್, ಮರದ ಪಾಲಿಶ್ ಮಾಡುತ್ತಾರೆ. 8 ವರ್ಷಗಳ ಅನುಭವ.'),

  w('w9', 'Farida Begum', '9876500009', 'hi', ['hi', 'bn'], 'domestic',
    ['cook', 'elder_care'], 10, 0, 5, 'anytime', 210, 4.9, 96, 5,
    ver('6673', 'Farida Begum'),
    'नॉर्थ इंडियन खाना, रोटी चपाती, बुजुर्गों की देखभाल',
    'रसोइया, बुजुर्गों की देखभाल का काम करते हैं। 10 साल का अनुभव।'),

  w('w10', 'Selvi R', '9876500010', 'ta', ['ta'], 'cleaning',
    ['home_cleaning', 'sofa_carpet'], 5, 3, 5, 'today', 33, 4.5, 21, 16,
    { status: 'unverified', method: 'simulated' },
    'வீட்டு சுத்தம், சோபா கம்பளம் சுத்தம் செய்கிறேன்',
    'வீட்டு சுத்தம், சோபா மற்றும் கம்பளம் செய்கிறார். 5 வருட அனுபவம்.'),

  w('w11', 'Imran Shaikh', '9876500011', 'hi', ['hi', 'mr'], 'appliance',
    ['ac_service', 'fridge_repair', 'washing_machine'], 6, 1, 10, 'anytime', 64, 4.6, 38, 8,
    ver('1195', 'Imran Shaikh'),
    'एसी सर्विस, फ्रिज और वॉशिंग मशीन रिपेयर करता हूँ',
    'एसी सर्विस, फ्रिज मरम्मत, वॉशिंग मशीन का काम करते हैं। 6 साल का अनुभव।'),

  w('w12', 'Babu Rao', '9876500012', 'te', ['te', 'hi'], 'scrap',
    ['paper_scrap', 'metal_scrap'], 15, 0, 5, 'anytime', 380, 4.4, 44, 12,
    ver('4408', 'Babu Rao'),
    'పేపర్, అట్ట, ఇనుము కొంటాను, ఇంటికే వచ్చి తీసుకుంటాను',
    'పేపర్ మరియు అట్ట, లోహపు స్క్రాప్ పని చేస్తారు. 15 సంవత్సరాల అనుభవం.'),

  w('w13', 'Gurpreet Singh', '9876500013', 'pa', ['pa', 'hi'], 'driving',
    ['car_driver', 'delivery'], 8, 2, 10, 'anytime', 96, 4.7, 52, 7,
    ver('3327', 'Gurpreet Singh'),
    'ਮੈਂ ਕਾਰ ਚਲਾਉਂਦਾ ਹਾਂ ਤੇ ਡਿਲਿਵਰੀ ਵੀ ਕਰਦਾ ਹਾਂ, ਅੱਠ ਸਾਲ ਦਾ ਤਜਰਬਾ',
    'ਕਾਰ ਡਰਾਈਵਰ, ਡਿਲਿਵਰੀ ਦਾ ਕੰਮ ਕਰਦੇ ਹਨ। 8 ਸਾਲ ਦਾ ਤਜਰਬਾ।'),

  w('w14', 'Bimal Das', '9876500014', 'bn', ['bn', 'hi'], 'security',
    ['security_guard', 'night_watch'], 11, 1, 10, 'anytime', 74, 4.5, 33, 20,
    ver('7752', 'Bimal Das'),
    'আমি নিরাপত্তা রক্ষীর কাজ করি, রাতের ডিউটিও করি',
    'নিরাপত্তা রক্ষী, রাতের প্রহরী কাজ করেন। 11 বছরের অভিজ্ঞতা।'),

  w('w15', 'Kiran Patel', '9876500015', 'gu', ['gu', 'hi'], 'gardening',
    ['gardener', 'tree_trim'], 5, 4, 5, 'weekdays', 28, 4.3, 17, 30,
    { status: 'failed', method: 'simulated', checkedAt: T - 5 * day, failureReason: 'checksum' },
    'હું બાગકામ અને વૃક્ષ કાપણીનું કામ કરું છું',
    'માળી, વૃક્ષ કાપણી નું કામ કરે છે. 5 વર્ષનો અનુભવ.'),

  w('w16', 'Mohan Lal', '9876500016', 'hi', ['hi'], 'maintenance',
    ['society_clean', 'water_tank_clean'], 9, 0, 10, 'weekdays', 58, 4.6, 29, 15,
    ver('5583', 'Mohan Lal'),
    'सोसाइटी की सफाई और पानी की टंकी सफाई करता हूँ',
    'सामान्य क्षेत्र सफाई, पानी की टंकी सफाई करते हैं। 9 साल का अनुभव।'),

  w('w17', 'Deepak Verma', '9876500017', 'hi', ['hi', 'en'], 'shop',
    ['shop_assistant', 'stock_help'], 3, 3, 5, 'anytime', 21, 4.1, 11, 13,
    ver('9940', 'Deepak Verma'),
    'दुकान में काउंटर और सामान की व्यवस्था का काम करता हूँ',
    'दुकान सहायक, सामान व्यवस्था का काम करते हैं। 3 साल का अनुभव।'),
];

/* ---------------------------------------------------- demo client accounts */

const clients: Client[] = [
  { id: 'c_demo', role: 'customer', name: 'Priya Menon', phone: '9000000002', lang: 'en',
    geo: { ...AREAS[0], address: 'Flat 402, Green Valley' }, emergencyContact: '9000000098', createdAt: T - 60 * day },

  { id: 's_demo', role: 'society', name: 'Anil Sharma', phone: '9000000003', lang: 'en',
    orgName: 'Green Valley Apartments', orgType: 'Apartment complex', size: 180,
    geo: { ...AREAS[0], address: 'Green Valley, 5th Block' }, createdAt: T - 90 * day },

  { id: 'b_demo', role: 'business', name: 'Rakesh Sharma', phone: '9000000004', lang: 'hi',
    orgName: 'Sharma Kirana Store', orgType: 'Grocery shop', size: 4,
    geo: { ...AREAS[1], address: 'Shop 12, HSR Main Road' }, createdAt: T - 45 * day },

  { id: 'c2', role: 'customer', name: 'Arjun Rao', phone: '9000000005', lang: 'en',
    geo: { ...AREAS[1], address: 'Flat 7B, Lake View' }, createdAt: T - 20 * day },
];

/* ------------------------------------------------------ real-sounding reviews */

function rv(id: string, workerId: string, author: string, stars: number, text: string, tags: string[], daysAgo: number): Review {
  return { id, jobId: `seed_${id}`, workerId, authorName: author, stars, text, tags, createdAt: T - daysAgo * day };
}

const reviews: Review[] = [
  rv('rv1', 'w_demo', 'Priya M.', 5, 'Fixed our wiring issue within 20 minutes. Very professional and punctual.', ['punctual', 'skilled'], 3),
  rv('rv2', 'w_demo', 'Arjun R.', 5, 'Came on a Sunday evening when our fan stopped. Charged exactly what he quoted.', ['punctual', 'polite'], 11),
  rv('rv3', 'w_demo', 'Meera S.', 4, 'Good work on the inverter. Took a little longer than expected but explained everything.', ['skilled'], 24),
  rv('rv4', 'w3', 'Kavita N.', 5, 'Stopped a bad kitchen leak in half an hour. Cleaned up completely before leaving.', ['punctual', 'clean', 'skilled'], 2),
  rv('rv5', 'w3', 'Sanjay P.', 5, 'Third time we have called him. Never had to call twice for the same problem.', ['skilled'], 15),
  rv('rv6', 'w5', 'Anita G.', 5, 'Works with our family for two years now. Completely trustworthy with the house keys.', ['polite', 'clean'], 6),
  rv('rv7', 'w9', 'Rohit K.', 5, 'Excellent cook. Made 40 rotis for a family function without any fuss.', ['skilled', 'punctual'], 8),
  rv('rv8', 'w7', 'Deepa V.', 4, 'Repaired two doors and a cupboard hinge. Solid work, slightly expensive.', ['skilled'], 19),
  rv('rv9', 'w11', 'Nikhil B.', 5, 'AC was cooling badly. He found a gas leak the last person missed.', ['skilled'], 5),
  rv('rv10', 'w13', 'Shalini D.', 5, 'Drove us to the airport at 4am, on time, very safe driving.', ['punctual', 'polite'], 9),
  rv('rv11', 'w2', 'Vikram J.', 4, 'Replaced the switchboard neatly. Only works weekdays which was a bit inconvenient.', ['skilled'], 12),
  rv('rv12', 'w6', 'Farah A.', 4, 'Deep cleaned the bathroom really well. Will call again.', ['clean'], 4),
];

/* --------------------------------------------------------------- open jobs */

const jobs: Job[] = [
  {
    id: 'j1', clientId: 'c_demo', clientRole: 'customer',
    title: 'Ceiling fan makes noise and stops sometimes',
    rawRequest: 'Ceiling fan is making noise and stops sometimes, need someone today',
    lang: 'en', category: 'electrical', serviceId: 'fan_repair',
    whenText: 'today evening', urgency: 'today', estimatedHours: 1,
    geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
    priceMin: 240, priceMax: 350, priceBasis: 'standard rate · 1 hour · same day',
    status: 'open', createdAt: T - 3600000 * 4,
  },
  {
    id: 'j2', clientId: 'b_demo', clientRole: 'business',
    title: 'दुकान के लिए हफ्ते में 3 दिन सफाई वाला चाहिए',
    rawRequest: 'दुकान के लिए हफ्ते में 3 दिन सफाई वाला चाहिए',
    lang: 'hi', category: 'cleaning', serviceId: 'home_cleaning',
    whenText: 'this week', urgency: 'this_week', estimatedHours: 2,
    geo: { ...AREAS[1], address: 'Shop 12, HSR Main Road' },
    priceMin: 500, priceMax: 700, priceBasis: 'standard rate · 2 hours · no rush',
    status: 'open', createdAt: T - 3600000 * 20,
  },
  {
    id: 'j3', clientId: 's_demo', clientRole: 'society',
    title: 'Water tank cleaning for 3 towers',
    rawRequest: 'We need water tank cleaning for 3 towers before the monsoon',
    lang: 'en', category: 'maintenance', serviceId: 'water_tank_clean',
    whenText: 'this week', urgency: 'this_week', estimatedHours: 6,
    geo: { ...AREAS[0], address: 'Green Valley, 5th Block' },
    priceMin: 2800, priceMax: 3900, priceBasis: 'standard rate · 6 hours · no rush',
    status: 'open', createdAt: T - 3600000 * 30,
  },
];

export const DEMO_ACCOUNTS = [
  { role: 'worker'   as const, phone: '9000000001', id: 'w_demo', labelKey: 'a.demoWorker'   as const },
  { role: 'customer' as const, phone: '9000000002', id: 'c_demo', labelKey: 'a.demoCustomer' as const },
  { role: 'society'  as const, phone: '9000000003', id: 's_demo', labelKey: 'a.demoSociety'  as const },
  { role: 'business' as const, phone: '9000000004', id: 'b_demo', labelKey: 'a.demoBusiness' as const },
];

export function seedDB(): DB {
  return {
    workers, clients, jobs, reviews,
    quotes: [], messages: [], sos: [],
    session: { role: null, id: null, lang: 'en' },
  };
}
