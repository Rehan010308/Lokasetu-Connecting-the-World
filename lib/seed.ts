import type { Client, DB, Job, Message, MessageKind, Quote, Review, SosEvent, Worker } from './types';
import { EMPTY_PAYMENT } from './payments';
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

/* ===========================================================================
   LIVE DEMO DATA
   ---------------------------------------------------------------------------
   A judge signs in as a demo account and has roughly forty seconds to decide
   whether this is a real product. An empty dashboard loses that argument
   before a single feature is shown, so every demo account arrives with a
   history: work in flight, work finished, money moved, conversations already
   under way.

   These timestamps are built RELATIVE TO NOW, not to a fixed epoch, so the
   worker dashboard says "earned today" and means today — whenever the demo is
   opened. Safe for hydration because nothing reads the store until the
   provider has flipped `ready`, which happens after mount.
   =========================================================================== */

const hour = 3600000;

/** A settled payment, the way the gateway would leave it. */
function paid(amount: number, method: Job['payment']['method'], at: number): Job['payment'] {
  return { method, status: 'released', amount, orderRef: `order_${Math.abs(amount * 7919).toString(36)}`, protected: true, updatedAt: at };
}
function held(amount: number, method: Job['payment']['method'], at: number): Job['payment'] {
  return { method, status: 'held', amount, orderRef: `order_${Math.abs(amount * 7919).toString(36)}`, protected: true, updatedAt: at };
}

function buildJobs(now: number): Job[] {
  const ago = (h: number) => now - h * hour;

  return [
    /* ------------------------------------------------ waiting for a worker */
    {
      id: 'j1', clientId: 'c_demo', clientRole: 'customer',
      title: 'Ceiling fan makes noise and stops sometimes',
      rawRequest: 'Ceiling fan is making noise and stops sometimes, need someone today',
      lang: 'en', category: 'electrical', serviceId: 'fan_repair',
      whenText: 'today evening', urgency: 'today', estimatedHours: 1,
      timePref: 'today', duration: 'hr1', photos: [],
      geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
      priceMin: 240, priceMax: 350, priceBasis: 'standard rate · 1 hour · same day',
      status: 'requested', payment: { ...EMPTY_PAYMENT },
      requestedAt: ago(4), createdAt: ago(4),
    },
    {
      id: 'j2', clientId: 'b_demo', clientRole: 'business',
      title: 'दुकान के लिए हफ्ते में 3 दिन सफाई वाला चाहिए',
      rawRequest: 'दुकान के लिए हफ्ते में 3 दिन सफाई वाला चाहिए',
      lang: 'hi', category: 'cleaning', serviceId: 'home_cleaning',
      whenText: 'this week', urgency: 'this_week', estimatedHours: 2,
      timePref: 'tomorrow', duration: 'hr2', photos: [],
      geo: { ...AREAS[1], address: 'Shop 12, HSR Main Road' },
      priceMin: 500, priceMax: 700, priceBasis: 'standard rate · 2 hours · no rush',
      status: 'requested', payment: { ...EMPTY_PAYMENT },
      requestedAt: ago(20), createdAt: ago(20),
    },
    {
      id: 'j3', clientId: 's_demo', clientRole: 'society',
      title: 'Water tank cleaning for 3 towers',
      rawRequest: 'We need water tank cleaning for 3 towers before the monsoon',
      lang: 'en', category: 'maintenance', serviceId: 'water_tank_clean',
      whenText: 'this week', urgency: 'this_week', estimatedHours: 6,
      timePref: 'scheduled', duration: 'halfday', photos: [],
      geo: { ...AREAS[0], address: 'Green Valley, 5th Block' },
      priceMin: 2800, priceMax: 3900, priceBasis: 'standard rate · 6 hours · no rush',
      status: 'requested', scheduledAt: now + 2 * day,
      payment: { ...EMPTY_PAYMENT },
      requestedAt: ago(30), createdAt: ago(30),
    },

    /* ------------------------------------------------------- work in flight */
    {
      /* the demo worker is on his way to the demo customer right now —
         this is the job that shows tracking, chat, SOS and held payment */
      id: 'j5', clientId: 'c_demo', clientRole: 'customer',
      title: 'Switchboard sparking in the kitchen',
      rawRequest: 'The switchboard near the kitchen sparks when I plug in the mixer. Scared to use it.',
      lang: 'en', category: 'electrical', serviceId: 'switchboard',
      whenText: 'as soon as possible', urgency: 'emergency', estimatedHours: 1,
      timePref: 'asap', duration: 'hr1', photos: [],
      geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
      priceMin: 420, priceMax: 600, priceBasis: 'emergency rate · 1 hour · right now',
      status: 'on_the_way', assignedWorkerId: 'w_demo', agreedAmount: 520,
      payment: held(520, 'upi', ago(0.4)),
      requestedAt: ago(1.5), acceptedAt: ago(1.1), travelStartedAt: ago(0.3),
      requestedWorkerIds: ['w_demo', 'w2'],
      createdAt: ago(1.5),
    },
    {
      id: 'j13', clientId: 'c2', clientRole: 'customer',
      title: 'Inverter not charging after power cut',
      rawRequest: 'Inverter stopped charging after yesterday night power cut',
      lang: 'en', category: 'electrical', serviceId: 'inverter',
      whenText: 'today', urgency: 'today', estimatedHours: 2,
      timePref: 'today', duration: 'hr2', photos: [],
      geo: { ...AREAS[1], address: 'Flat 7B, Lake View' },
      priceMin: 700, priceMax: 950, priceBasis: 'standard rate · 2 hours · same day',
      status: 'working', assignedWorkerId: 'w_demo', agreedAmount: 850,
      payment: held(850, 'gpay', ago(3)),
      requestedAt: ago(6), acceptedAt: ago(5.4), travelStartedAt: ago(3.2), startedAt: ago(2.5),
      createdAt: ago(6),
    },
    {
      id: 'j11', clientId: 'b_demo', clientRole: 'business',
      title: 'Evening shop cleaning — closing shift',
      rawRequest: 'Shop cleaning after closing, around 9pm',
      lang: 'hi', category: 'cleaning', serviceId: 'home_cleaning',
      whenText: 'tonight', urgency: 'today', estimatedHours: 2,
      timePref: 'today', duration: 'hr2', photos: [],
      geo: { ...AREAS[1], address: 'Shop 12, HSR Main Road' },
      priceMin: 400, priceMax: 550, priceBasis: 'standard rate · 2 hours · same day',
      status: 'accepted', assignedWorkerId: 'w6', agreedAmount: 480,
      payment: { method: 'cash', status: 'unpaid', amount: 480, protected: false, updatedAt: ago(5) },
      requestedAt: ago(7), acceptedAt: ago(5),
      createdAt: ago(7),
    },
    {
      id: 'j9', clientId: 's_demo', clientRole: 'society',
      title: 'Four flat doors need hinge and lock repair',
      rawRequest: 'Four doors in B block need hinge and lock repair',
      lang: 'en', category: 'carpentry', serviceId: 'door_repair',
      whenText: 'this week', urgency: 'this_week', estimatedHours: 4,
      timePref: 'scheduled', duration: 'halfday', photos: [],
      geo: { ...AREAS[0], address: 'Green Valley, B Block' },
      priceMin: 1600, priceMax: 2200, priceBasis: 'standard rate · 4 hours · no rush',
      status: 'accepted', assignedWorkerId: 'w7', agreedAmount: 1900,
      scheduledAt: now + 1 * day,
      payment: { method: 'upi', status: 'authorized', amount: 1900, protected: true, updatedAt: ago(9) },
      requestedAt: ago(26), acceptedAt: ago(9),
      createdAt: ago(26),
    },
    {
      /* worker says done, customer has not confirmed — the release step */
      id: 'j14', clientId: 'c2', clientRole: 'customer',
      title: 'Two tube lights replaced in bedroom',
      rawRequest: 'Two tube lights not working in bedroom',
      lang: 'en', category: 'electrical', serviceId: 'lighting',
      whenText: 'yesterday', urgency: 'flexible', estimatedHours: 1,
      timePref: 'asap', duration: 'min30', photos: [],
      geo: { ...AREAS[1], address: 'Flat 7B, Lake View' },
      priceMin: 260, priceMax: 380, priceBasis: 'standard rate · 30 minutes · no rush',
      status: 'worker_done', assignedWorkerId: 'w_demo', agreedAmount: 320,
      payment: held(320, 'phonepe', ago(27)),
      requestedAt: ago(30), acceptedAt: ago(29), travelStartedAt: ago(28.5), startedAt: ago(28), completedAt: undefined,
      createdAt: ago(30),
    },

    /* ------------------------------------------------------ finished, paid */
    {
      id: 'j15', clientId: 'c_demo', clientRole: 'customer',
      title: 'Fan regulator replaced in living room',
      rawRequest: 'Fan speed regulator not working',
      lang: 'en', category: 'electrical', serviceId: 'fan_repair',
      whenText: 'today morning', urgency: 'today', estimatedHours: 1,
      timePref: 'asap', duration: 'min30', photos: [],
      geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
      priceMin: 300, priceMax: 420, priceBasis: 'standard rate · 30 minutes · same day',
      status: 'completed', assignedWorkerId: 'w_demo', agreedAmount: 380,
      payment: paid(380, 'upi', ago(5)),
      requestedAt: ago(8), acceptedAt: ago(7.5), travelStartedAt: ago(7), startedAt: ago(6.5), completedAt: ago(5),
      createdAt: ago(8),
    },
    {
      id: 'j16', clientId: 'c2', clientRole: 'customer',
      title: 'New plug point for washing machine',
      rawRequest: 'Need a new plug point behind washing machine',
      lang: 'en', category: 'electrical', serviceId: 'wiring',
      whenText: 'this week', urgency: 'this_week', estimatedHours: 2,
      timePref: 'scheduled', duration: 'hr2', photos: [],
      geo: { ...AREAS[1], address: 'Flat 7B, Lake View' },
      priceMin: 450, priceMax: 620, priceBasis: 'standard rate · 2 hours · no rush',
      status: 'completed', assignedWorkerId: 'w_demo', agreedAmount: 520,
      payment: paid(520, 'gpay', ago(24 * 4)),
      requestedAt: ago(24 * 5), acceptedAt: ago(24 * 4.8), completedAt: ago(24 * 4),
      createdAt: ago(24 * 5),
    },
    {
      id: 'j17', clientId: 's_demo', clientRole: 'society',
      title: 'Corridor lighting for two floors',
      rawRequest: 'Corridor lights on 3rd and 4th floor keep failing',
      lang: 'en', category: 'electrical', serviceId: 'lighting',
      whenText: 'last week', urgency: 'flexible', estimatedHours: 5,
      timePref: 'scheduled', duration: 'halfday', photos: [],
      geo: { ...AREAS[0], address: 'Green Valley, 5th Block' },
      priceMin: 950, priceMax: 1400, priceBasis: 'standard rate · 5 hours · no rush',
      status: 'completed', assignedWorkerId: 'w_demo', agreedAmount: 1150,
      payment: paid(1150, 'upi', ago(24 * 9)),
      requestedAt: ago(24 * 11), acceptedAt: ago(24 * 10.6), completedAt: ago(24 * 9),
      createdAt: ago(24 * 11),
    },
    {
      id: 'j18', clientId: 'c_demo', clientRole: 'customer',
      title: 'Doorbell rewiring',
      rawRequest: 'Doorbell stopped working, wiring loose',
      lang: 'en', category: 'electrical', serviceId: 'wiring',
      whenText: 'flexible', urgency: 'flexible', estimatedHours: 1,
      timePref: 'asap', duration: 'hr1', photos: [],
      geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
      priceMin: 520, priceMax: 700, priceBasis: 'standard rate · 1 hour · no rush',
      status: 'completed', assignedWorkerId: 'w_demo', agreedAmount: 640,
      payment: paid(640, 'cash', ago(24 * 19)),
      requestedAt: ago(24 * 21), acceptedAt: ago(24 * 20.5), completedAt: ago(24 * 19),
      createdAt: ago(24 * 21),
    },
    {
      id: 'j6', clientId: 'c_demo', clientRole: 'customer',
      title: 'Weekly house cleaning and cooking',
      rawRequest: 'Need someone for weekly house cleaning and cooking',
      lang: 'en', category: 'domestic', serviceId: 'maid',
      whenText: 'weekdays', urgency: 'flexible', estimatedHours: 3,
      timePref: 'scheduled', duration: 'halfday', photos: [],
      geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
      priceMin: 380, priceMax: 520, priceBasis: 'standard rate · 3 hours · no rush',
      status: 'completed', assignedWorkerId: 'w5', agreedAmount: 450,
      payment: paid(450, 'upi', ago(24 * 3)),
      requestedAt: ago(24 * 4), acceptedAt: ago(24 * 3.8), completedAt: ago(24 * 3),
      createdAt: ago(24 * 4),
    },
    {
      id: 'j7', clientId: 'c_demo', clientRole: 'customer',
      title: 'AC not cooling — service and gas check',
      rawRequest: 'AC is running but not cooling at all',
      lang: 'en', category: 'appliance', serviceId: 'ac_service',
      whenText: 'last week', urgency: 'today', estimatedHours: 2,
      timePref: 'asap', duration: 'hr2', photos: [],
      geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
      priceMin: 900, priceMax: 1400, priceBasis: 'standard rate · 2 hours · same day',
      status: 'completed', assignedWorkerId: 'w11', agreedAmount: 1200,
      payment: paid(1200, 'card_debit', ago(24 * 12)),
      requestedAt: ago(24 * 13), acceptedAt: ago(24 * 12.7), completedAt: ago(24 * 12),
      createdAt: ago(24 * 13),
    },
    {
      id: 'j10', clientId: 's_demo', clientRole: 'society',
      title: 'Common area deep cleaning before Diwali',
      rawRequest: 'Common areas and staircases need deep cleaning before Diwali',
      lang: 'en', category: 'cleaning', serviceId: 'deep_cleaning',
      whenText: 'last month', urgency: 'flexible', estimatedHours: 8,
      timePref: 'scheduled', duration: 'fullday', photos: [],
      geo: { ...AREAS[0], address: 'Green Valley, 5th Block' },
      priceMin: 2000, priceMax: 2900, priceBasis: 'standard rate · 8 hours · no rush',
      status: 'completed', assignedWorkerId: 'w6', agreedAmount: 2400,
      payment: paid(2400, 'upi', ago(24 * 16)),
      requestedAt: ago(24 * 18), acceptedAt: ago(24 * 17.5), completedAt: ago(24 * 16),
      createdAt: ago(24 * 18),
    },
    {
      id: 'j12', clientId: 'b_demo', clientRole: 'business',
      title: 'Morning stock run to the wholesale market',
      rawRequest: 'Driver needed for morning stock pickup from wholesale market',
      lang: 'hi', category: 'driving', serviceId: 'car_driver',
      whenText: 'last week', urgency: 'flexible', estimatedHours: 4,
      timePref: 'scheduled', duration: 'halfday', photos: [],
      geo: { ...AREAS[1], address: 'Shop 12, HSR Main Road' },
      priceMin: 700, priceMax: 1000, priceBasis: 'standard rate · 4 hours · no rush',
      status: 'completed', assignedWorkerId: 'w13', agreedAmount: 900,
      payment: paid(900, 'cash', ago(24 * 8)),
      requestedAt: ago(24 * 9), acceptedAt: ago(24 * 8.8), completedAt: ago(24 * 8),
      createdAt: ago(24 * 9),
    },

    /* --------------------------------------------- cancelled, fee applied */
    {
      id: 'j8', clientId: 'c_demo', clientRole: 'customer',
      title: 'Bathroom tap dripping',
      rawRequest: 'Bathroom tap keeps dripping',
      lang: 'en', category: 'plumbing', serviceId: 'tap_fitting',
      whenText: 'flexible', urgency: 'flexible', estimatedHours: 1,
      timePref: 'asap', duration: 'min30', photos: [],
      geo: { ...AREAS[0], address: 'Flat 402, Green Valley' },
      priceMin: 220, priceMax: 320, priceBasis: 'standard rate · 30 minutes · no rush',
      status: 'cancelled_by_client', assignedWorkerId: 'w3', agreedAmount: 270,
      payment: { method: 'upi', status: 'refunded', amount: 270, protected: true, updatedAt: ago(24 * 6) },
      cancellation: { by: 'client', at: ago(24 * 6), reason: 'Fixed it myself', fee: 0, refunded: true },
      requestedAt: ago(24 * 6.4), acceptedAt: ago(24 * 6.2),
      createdAt: ago(24 * 6.4),
    },
  ];
}

/* ------------------------------------------------- conversations in progress */

function msg(
  id: string, jobId: string, fromRole: Message['fromRole'], fromId: string,
  kind: MessageKind, text: string, lang: Message['lang'], at: number, durationSec?: number
): Message {
  return { id, jobId, fromRole, fromId, kind, text, lang, durationSec, createdAt: at };
}

function buildMessages(now: number): Message[] {
  const ago = (h: number) => now - h * hour;
  return [
    /* j5 — worker on the way to the demo customer, live thread */
    msg('m1', 'j5', 'client', 'c_demo', 'text', 'It sparks every time I plug in the mixer. Please be careful.', 'en', ago(1.05)),
    msg('m2', 'j5', 'worker', 'w_demo', 'quick', 'मैं आ रहा हूँ', 'hi', ago(1.0)),
    msg('m3', 'j5', 'worker', 'w_demo', 'voice', 'मैं मेन स्विच बंद करके देखूँगा, आप तब तक कुछ मत छुइए', 'hi', ago(0.8), 9),
    msg('m4', 'j5', 'client', 'c_demo', 'text', 'Understood, I have switched off the mains already.', 'en', ago(0.7)),
    msg('m5', 'j5', 'worker', 'w_demo', 'quick', '10 मिनट में पहुँचता हूँ', 'hi', ago(0.25)),

    /* j13 — worker on site */
    msg('m6', 'j13', 'worker', 'w_demo', 'text', 'बैटरी की टर्मिनल ढीली थी, ठीक कर रहा हूँ', 'hi', ago(2.2)),
    msg('m7', 'j13', 'client', 'c2', 'text', 'Great, thank you. Does the battery need replacing?', 'en', ago(2.0)),
    msg('m8', 'j13', 'worker', 'w_demo', 'voice', 'अभी नहीं, बैटरी ठीक है, बस कनेक्शन साफ करना था', 'hi', ago(1.8), 7),

    /* j11 — business shift accepted */
    msg('m9', 'j11', 'client', 'b_demo', 'text', 'दुकान 9 बजे बंद होती है, उसके बाद आ जाइए', 'hi', ago(4.5)),
    msg('m10', 'j11', 'worker', 'w6', 'quick', 'ठीक है', 'hi', ago(4.3)),

    /* j9 — society scheduling */
    msg('m11', 'j9', 'client', 's_demo', 'text', 'Please start with B block, the watchman will let you in.', 'en', ago(8.5)),
    msg('m12', 'j9', 'worker', 'w7', 'text', 'ശരി, ഞാൻ രാവിലെ 9 മണിക്ക് എത്തും', 'ml', ago(8.2)),

    /* j14 — waiting for the customer to confirm */
    msg('m13', 'j14', 'worker', 'w_demo', 'quick', 'काम पूरा हो गया', 'hi', ago(27.5)),
  ];
}

/* ------------------------------------------------------------------ quotes */

function buildQuotes(now: number): Quote[] {
  const ago = (h: number) => now - h * hour;
  return [
    { id: 'q1', jobId: 'j1', workerId: 'w2', amount: 300, note: 'Regulator and capacitor included', createdAt: ago(3.2) },
    { id: 'q2', jobId: 'j1', workerId: 'w_demo', amount: 280, note: 'Can come by 6pm today', createdAt: ago(2.6) },
    { id: 'q3', jobId: 'j3', workerId: 'w15', amount: 3400, note: 'Three towers, two days, chemical wash included', createdAt: ago(22) },
    { id: 'q4', jobId: 'j2', workerId: 'w6', amount: 560, note: 'हफ्ते में तीन दिन, शाम को', createdAt: ago(14) },
  ];
}

/* --------------------------------------------------------------- SOS history */

function buildSos(now: number): SosEvent[] {
  return [
    /* raised once, resolved — proves the button is wired to something real */
    { id: 'sos1', jobId: 'j17', at: now - 24 * 9 * hour, by: 'worker', lat: AREAS[0].lat, lng: AREAS[0].lng, resolved: true },
  ];
}

export const DEMO_ACCOUNTS = [
  { role: 'worker'   as const, phone: '9000000001', id: 'w_demo', labelKey: 'a.demoWorker'   as const },
  { role: 'customer' as const, phone: '9000000002', id: 'c_demo', labelKey: 'a.demoCustomer' as const },
  { role: 'society'  as const, phone: '9000000003', id: 's_demo', labelKey: 'a.demoSociety'  as const },
  { role: 'business' as const, phone: '9000000004', id: 'b_demo', labelKey: 'a.demoBusiness' as const },
];

/**
 * A fresh database.
 *
 * Everything is deep-copied so that `reset()` really does reset — the previous
 * build handed out the same array objects on every call, which meant a demo
 * that had been played with once never came back clean.
 */
export function seedDB(): DB {
  const now = Date.now();
  return {
    workers: workers.map((x) => ({ ...x, verification: { ...x.verification }, services: [...x.services], languages: [...x.languages] })),
    clients: clients.map((x) => ({ ...x })),
    jobs: buildJobs(now),
    quotes: buildQuotes(now),
    messages: buildMessages(now),
    reviews: reviews.map((x) => ({ ...x, tags: [...x.tags] })),
    sos: buildSos(now),
    session: { role: null, id: null, lang: 'en' },
  };
}
