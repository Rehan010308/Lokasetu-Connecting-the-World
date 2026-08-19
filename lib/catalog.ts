/* ===========================================================================
   THE CATALOGUE — two levels, one source of truth.

   V1 had a single flat list of trades, which is why workers turned up under
   the wrong heading: "fan repair" and "wiring" were both just "electrician",
   so a search for one returned everyone who did the other.

   V2 separates CATEGORY (what a customer browses) from SERVICE (what a worker
   actually does). A worker is tagged with services; a service belongs to
   exactly one category. Search filters on services, so a plumber can never
   appear under Painting.
   =========================================================================== */

export type CategoryId =
  | 'electrical' | 'plumbing' | 'painting' | 'carpentry' | 'cleaning'
  | 'domestic'   | 'appliance' | 'driving' | 'security'  | 'gardening'
  | 'scrap'      | 'shop'      | 'maintenance';

export interface Service {
  id: string;
  category: CategoryId;
  /** i18n key: svc.<id> */
  icon: string;
  /** typical visit charge in INR, used by the pricing engine */
  base: number;
  hourly: number;
  /** words that map speech/text onto this service, across scripts */
  match: string[];
}

export interface Category {
  id: CategoryId;
  icon: string;
  /** i18n key: cat.<id> */
  services: string[];
}

export const SERVICES: Service[] = [
  /* ---- electrical ---- */
  { id: 'fan_repair',   category: 'electrical', icon: '🌀', base: 250, hourly: 200, match: ['fan', 'ceiling fan', 'पंखा', 'விசிறி', 'ఫ్యాన్', 'ಫ್ಯಾನ್', 'ഫാൻ', 'पंखा', 'পাখা', 'પંખો', 'ਪੱਖਾ', 'ਪੱਖਾ', 'પંખો', 'পাখা'] },
  { id: 'wiring',       category: 'electrical', icon: '🔌', base: 300, hourly: 250, match: ['wiring', 'wire', 'वायरिंग', 'तार', 'வயரிங்', 'వైరింగ్', 'ವೈರಿಂಗ್', 'വയറിംഗ്', 'ওয়্যারিং', 'વાયરિંગ', 'ਵਾਇਰਿੰਗ', 'ਬਿਜਲੀ', 'વીજળી', 'বিদ্যুৎ', 'वीज', 'electric', 'electrician', 'electrical'] },
  { id: 'inverter',     category: 'electrical', icon: '🔋', base: 350, hourly: 250, match: ['inverter', 'battery', 'ups', 'इन्वर्टर', 'இன்வெர்ட்டர்', 'ఇన్వర్టర్', 'ಇನ್ವರ್ಟರ್', 'ഇൻവെർട്ടർ'] },
  { id: 'switchboard',  category: 'electrical', icon: '🎛️', base: 220, hourly: 200, match: ['switch', 'socket', 'board', 'plug', 'स्विच', 'सॉकेट', 'சுவிட்ச்', 'స్విచ్', 'ಸ್ವಿಚ್', 'സ്വിച്ച്'] },
  { id: 'lighting',     category: 'electrical', icon: '💡', base: 200, hourly: 180, match: ['light', 'bulb', 'tube', 'lamp', 'लाइट', 'बल्ब', 'விளக்கு', 'లైట్', 'ಲೈಟ್', 'ലൈറ്റ്', 'বাতি', 'લાઇટ'] },
  { id: 'geyser',       category: 'electrical', icon: '🚿', base: 400, hourly: 300, match: ['geyser', 'water heater', 'गीजर', 'கீசர்', 'గీజర్', 'ಗೀಸರ್'] },

  /* ---- plumbing ---- */
  { id: 'leak_repair',  category: 'plumbing', icon: '💧', base: 280, hourly: 220, match: ['leak', 'leaking', 'drip', 'लीक', 'रिसाव', 'கசிவு', 'లీక్', 'ಸೋರಿಕೆ', 'ചോർച്ച', 'গলদ', 'લીક', 'ਲੀਕ', 'લીક', 'লিক', 'गळती', 'plumber', 'plumbing'] },
  { id: 'pipe_work',    category: 'plumbing', icon: '🪠', base: 320, hourly: 250, match: ['pipe', 'pipeline', 'पाइप', 'குழாய்', 'పైపు', 'ಪೈಪ್', 'പൈപ്പ്', 'পাইপ', 'પાઇપ', 'ਪਾਈਪ'] },
  { id: 'tap_fitting',  category: 'plumbing', icon: '🚰', base: 220, hourly: 200, match: ['tap', 'faucet', 'नल', 'குழாய் தலை', 'కుళాయి', 'ನಲ್ಲಿ', 'ടാപ്പ്', 'কল', 'નળ', 'ਟੂਟੀ', 'ਟੂਟੀ', 'નળ', 'কল', 'नळ'] },
  { id: 'drain_clean',  category: 'plumbing', icon: '🧽', base: 300, hourly: 250, match: ['drain', 'blockage', 'choke', 'नाली', 'जाम', 'வடிகால்', 'డ్రెయిన్', 'ಚರಂಡಿ', 'ഓട'] },
  { id: 'toilet_repair',category: 'plumbing', icon: '🚽', base: 350, hourly: 260, match: ['toilet', 'flush', 'commode', 'शौचालय', 'फ्लश', 'கழிப்பறை', 'టాయిలెట్', 'ಶೌಚಾಲಯ'] },
  { id: 'tank_motor',   category: 'plumbing', icon: '⚙️', base: 400, hourly: 300, match: ['tank', 'motor', 'pump', 'टंकी', 'मोटर', 'தொட்டி', 'ట్యాంక్', 'ಟ್ಯಾಂಕ್', 'ടാങ്ക്'] },

  /* ---- painting ---- */
  { id: 'interior_paint', category: 'painting', icon: '🎨', base: 600, hourly: 320, match: ['interior', 'inside paint', 'room paint', 'अंदर', 'भीतरी', 'உள்', 'లోపల', 'ಒಳಾಂಗಣ', 'paint', 'painting', 'painter', 'रंग', 'पुताई', 'पेंट', 'வர்ணம்', 'பெயிண்ட்', 'పెయింట్', 'రంగు', 'ಬಣ್ಣ', 'ಪೇಂಟ್', 'പെയിന്റ്', 'ചായം', 'रंगकाम', 'রং', 'রঙ', 'રંગ', 'ਰੰਗ', 'ਪੇਂਟ'] },
  { id: 'exterior_paint', category: 'painting', icon: '🏠', base: 800, hourly: 350, match: ['exterior', 'outside', 'बाहर', 'வெளிப்புற', 'బయట', 'ಹೊರಾಂಗಣ'] },
  { id: 'putty_primer',   category: 'painting', icon: '🪣', base: 500, hourly: 300, match: ['putty', 'primer', 'पुट्टी', 'प्राइमर', 'பூச்சு', 'పుట్టీ'] },
  { id: 'wood_polish',    category: 'painting', icon: '🪵', base: 550, hourly: 320, match: ['polish', 'varnish', 'पॉलिश', 'மெருகு', 'పాలిష్', 'ಪಾಲಿಶ್'] },

  /* ---- carpentry ---- */
  { id: 'door_repair',  category: 'carpentry', icon: '🚪', base: 320, hourly: 260, match: ['door', 'दरवाजा', 'कतार', 'கதவு', 'తలుపు', 'ಬಾಗಿಲು', 'വാതിൽ', 'দরজা', 'બારણું', 'ਦਰਵਾਜ਼ਾ', 'ਤਰਖਾਣ', 'સુથાર', 'ছুতার', 'सुतार', 'carpenter', 'carpentry'] },
  { id: 'furniture',    category: 'carpentry', icon: '🪑', base: 450, hourly: 300, match: ['furniture', 'table', 'chair', 'bed', 'फर्नीचर', 'மேசை', 'ఫర్నిచర్', 'ಪೀಠೋಪಕರಣ'] },
  { id: 'cupboard',     category: 'carpentry', icon: '🗄️', base: 500, hourly: 320, match: ['cupboard', 'wardrobe', 'almirah', 'अलमारी', 'அலமாரி', 'అల్మారా', 'ಕಪಾಟು', 'അലമാര'] },
  { id: 'lock_hinge',   category: 'carpentry', icon: '🔩', base: 220, hourly: 200, match: ['lock', 'hinge', 'handle', 'ताला', 'कब्जा', 'பூட்டு', 'తాళం', 'ಬೀಗ'] },

  /* ---- cleaning ---- */
  { id: 'home_cleaning',  category: 'cleaning', icon: '🧹', base: 400, hourly: 200, match: ['clean', 'cleaning', 'sweep', 'mop', 'सफाई', 'झाड़ू', 'சுத்தம்', 'శుభ్రం', 'ಸ್ವಚ್ಛ', 'വൃത്തി', 'পরিষ্কার', 'સફાઈ', 'ਸਫਾਈ', 'ਸਫਾਈ', 'સફાઈ', 'পরিষ্কার', 'स्वच्छता', 'cleaner'] },
  { id: 'deep_cleaning',  category: 'cleaning', icon: '🫧', base: 900, hourly: 300, match: ['deep clean', 'gहरी सफाई', 'डीप क्लीन', 'ஆழ்ந்த சுத்தம்'] },
  { id: 'bathroom_clean', category: 'cleaning', icon: '🛁', base: 350, hourly: 220, match: ['bathroom', 'washroom', 'बाथरूम', 'குளியலறை', 'బాత్రూమ్', 'ಸ್ನಾನಗೃಹ'] },
  { id: 'sofa_carpet',    category: 'cleaning', icon: '🛋️', base: 700, hourly: 280, match: ['sofa', 'carpet', 'सोफा', 'कालीन', 'சோபா', 'సోఫా'] },

  /* ---- domestic help ---- */
  { id: 'maid',       category: 'domestic', icon: '🧺', base: 350, hourly: 180, match: ['maid', 'house help', 'bai', 'कामवाली', 'नौकरानी', 'வேலைக்காரி', 'పనిమనిషి', 'ಮನೆಕೆಲಸ', 'ਘਰੇਲੂ', 'ઘરકામ', 'গৃহকর্মী', 'घरकाम', 'बाई'] },
  { id: 'cook',       category: 'domestic', icon: '🍲', base: 450, hourly: 260, match: ['cook', 'cooking', 'khana', 'रसोइया', 'खाना', 'சமையல்', 'వంట', 'ಅಡುಗೆ', 'പാചകം', 'রান্না', 'રસોઈ', 'ਰਸੋਈ', 'રસોઈ', 'রান্না', 'स्वयंपाक'] },
  { id: 'babysitter', category: 'domestic', icon: '🍼', base: 400, hourly: 220, match: ['baby', 'child care', 'aya', 'बच्चा', 'आया', 'குழந்தை', 'పిల్లల', 'ಮಗು'] },
  { id: 'elder_care', category: 'domestic', icon: '🧓', base: 500, hourly: 250, match: ['elder', 'old age', 'attendant', 'बुजुर्ग', 'முதியோர்', 'వృద్ధుల', 'ಹಿರಿಯರ'] },

  /* ---- appliance / mechanic ---- */
  { id: 'ac_service',   category: 'appliance', icon: '❄️', base: 500, hourly: 350, match: ['ac', 'air conditioner', 'एसी', 'ஏசி', 'ఏసీ', 'ಎಸಿ', 'ਏਸੀ', 'એસી', 'এসি', 'mechanic', 'ਮਕੈਨਿਕ'] },
  { id: 'fridge_repair',category: 'appliance', icon: '🧊', base: 450, hourly: 320, match: ['fridge', 'refrigerator', 'फ्रिज', 'குளிர்சாதன', 'ఫ్రిజ్', 'ಫ್ರಿಜ್'] },
  { id: 'washing_machine', category: 'appliance', icon: '🌊', base: 450, hourly: 320, match: ['washing machine', 'वॉशिंग मशीन', 'சலவை இயந்திரம்', 'వాషింగ్ మెషిన్'] },
  { id: 'two_wheeler',  category: 'appliance', icon: '🛵', base: 300, hourly: 250, match: ['bike', 'scooter', 'mechanic', 'गाड़ी', 'मैकेनिक', 'இருசக்கர', 'బైక్', 'ಬೈಕ್'] },

  /* ---- driving ---- */
  { id: 'car_driver',   category: 'driving', icon: '🚗', base: 600, hourly: 200, match: ['driver', 'car', 'ड्राइवर', 'ஓட்டுநர்', 'డ్రైవర్', 'ಚಾಲಕ', 'ഡ്രൈവർ', 'চালক', 'ਕਾਰ', 'ਡਰਾਈਵਰ', 'ਚਲਾਉਂਦਾ', 'ਗੱਡੀ', 'કાર', 'ડ્રાઇવર', 'গাড়ি', 'ড্রাইভার', 'गाडी', 'ड्रायव्हर', 'കാർ'] },
  { id: 'delivery',     category: 'driving', icon: '📦', base: 300, hourly: 150, match: ['delivery', 'courier', 'डिलीवरी', 'விநியோகம்', 'డెలివరీ', 'ವಿತರಣೆ', 'ਡਿਲਿਵਰੀ', 'ડિલિવરી', 'ডেলিভারি', 'डिलिव्हरी'] },
  { id: 'loading',      category: 'driving', icon: '🏋️', base: 400, hourly: 200, match: ['loading', 'shifting', 'लोडिंग', 'सामान', 'சுமை', 'లోడింగ్'] },

  /* ---- security ---- */
  { id: 'security_guard', category: 'security', icon: '🛡️', base: 700, hourly: 120, match: ['guard', 'security', 'watchman', 'गार्ड', 'चौकीदार', 'காவலர்', 'సెక్యూరిటీ', 'ಕಾವಲುಗಾರ', 'ਗਾਰਡ', 'ਸੁਰੱਖਿਆ', 'સુરક્ષા', 'ગાર્ડ', 'নিরাপত্তা', 'রক্ষী', 'सुरक्षा', 'रक्षक'] },
  { id: 'night_watch',    category: 'security', icon: '🌙', base: 800, hourly: 130, match: ['night guard', 'रात', 'இரவு', 'రాత్రి', 'ರಾತ್ರಿ'] },

  /* ---- gardening ---- */
  { id: 'gardener',     category: 'gardening', icon: '🌿', base: 350, hourly: 200, match: ['garden', 'mali', 'plants', 'माली', 'बगीचा', 'தோட்டம்', 'తోట', 'ತೋಟ', 'বাগান', 'ਮਾਲੀ', 'માળી', 'মালী', 'माळी'] },
  { id: 'tree_trim',    category: 'gardening', icon: '🌳', base: 500, hourly: 280, match: ['tree', 'trim', 'pruning', 'पेड़', 'மரம்', 'చెట్టు', 'ಮರ'] },

  /* ---- scrap ---- */
  { id: 'paper_scrap',  category: 'scrap', icon: '📰', base: 0, hourly: 0, match: ['paper', 'newspaper', 'raddi', 'रद्दी', 'अखबार', 'பேப்பர்', 'పేపర్', 'ಪೇಪರ್', 'কাগজ', 'ਕਬਾੜ', 'ਰੱਦੀ', 'ભંગાર', 'ভাঙারি', 'भंगार', 'scrap'] },
  { id: 'metal_scrap',  category: 'scrap', icon: '🔧', base: 0, hourly: 0, match: ['metal', 'iron', 'kabad', 'लोहा', 'कबाड़', 'இரும்பு', 'ఇనుము', 'ಕಬ್ಬಿಣ'] },
  { id: 'ewaste',       category: 'scrap', icon: '🖥️', base: 0, hourly: 0, match: ['e-waste', 'electronic', 'laptop', 'ई-कचरा', 'மின்னணு', 'ఈ-వ్యర్థ'] },

  /* ---- shop help ---- */
  { id: 'shop_assistant', category: 'shop', icon: '🏪', base: 500, hourly: 110, match: ['shop', 'store', 'counter', 'billing', 'दुकान', 'கடை', 'దుకాణం', 'ಅಂಗಡಿ', 'ਦੁਕਾਨ', 'દુકાન', 'দোকান', 'दुकान'] },
  { id: 'stock_help',     category: 'shop', icon: '📦', base: 450, hourly: 110, match: ['stock', 'inventory', 'स्टॉक', 'சரக்கு', 'స్టాక్'] },

  /* ---- society maintenance ---- */
  { id: 'society_clean',  category: 'maintenance', icon: '🏢', base: 800, hourly: 150, match: ['society cleaning', 'common area', 'सोसाइटी', 'குடியிருப்பு', 'సొసైటీ', 'ਸੋਸਾਇਟੀ', 'સોસાયટી', 'সোসাইটি', 'सोसायटी'] },
  { id: 'lift_amc',       category: 'maintenance', icon: '🛗', base: 1200, hourly: 400, match: ['lift', 'elevator', 'लिफ्ट', 'மின்தூக்கி', 'లిఫ్ట్'] },
  { id: 'water_tank_clean', category: 'maintenance', icon: '🪣', base: 1500, hourly: 350, match: ['water tank cleaning', 'टंकी सफाई', 'தொட்டி சுத்தம்'] },
];

export const CATEGORIES: Category[] = [
  { id: 'electrical',  icon: '⚡', services: ['fan_repair', 'wiring', 'inverter', 'switchboard', 'lighting', 'geyser'] },
  { id: 'plumbing',    icon: '🔧', services: ['leak_repair', 'pipe_work', 'tap_fitting', 'drain_clean', 'toilet_repair', 'tank_motor'] },
  { id: 'cleaning',    icon: '🧹', services: ['home_cleaning', 'deep_cleaning', 'bathroom_clean', 'sofa_carpet'] },
  { id: 'domestic',    icon: '🏠', services: ['maid', 'cook', 'babysitter', 'elder_care'] },
  { id: 'painting',    icon: '🎨', services: ['interior_paint', 'exterior_paint', 'putty_primer', 'wood_polish'] },
  { id: 'carpentry',   icon: '🪚', services: ['door_repair', 'furniture', 'cupboard', 'lock_hinge'] },
  { id: 'appliance',   icon: '❄️', services: ['ac_service', 'fridge_repair', 'washing_machine', 'two_wheeler'] },
  { id: 'driving',     icon: '🚗', services: ['car_driver', 'delivery', 'loading'] },
  { id: 'security',    icon: '🛡️', services: ['security_guard', 'night_watch'] },
  { id: 'gardening',   icon: '🌿', services: ['gardener', 'tree_trim'] },
  { id: 'scrap',       icon: '♻️', services: ['paper_scrap', 'metal_scrap', 'ewaste'] },
  { id: 'shop',        icon: '🏪', services: ['shop_assistant', 'stock_help'] },
  { id: 'maintenance', icon: '🏢', services: ['society_clean', 'lift_amc', 'water_tank_clean'] },
];

const SERVICE_MAP = new Map(SERVICES.map((s) => [s.id, s]));
const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

export function service(id: string): Service | undefined { return SERVICE_MAP.get(id); }
export function category(id: CategoryId): Category | undefined { return CATEGORY_MAP.get(id); }
export function servicesOf(id: CategoryId): Service[] {
  return (category(id)?.services ?? []).map((s) => SERVICE_MAP.get(s)!).filter(Boolean);
}
export function categoryOfService(id: string): CategoryId | undefined { return SERVICE_MAP.get(id)?.category; }

/** Every service whose keywords appear in the text, best first. */
export function matchServices(text: string): { service: Service; hits: number }[] {
  const low = text.toLowerCase();
  return SERVICES
    .map((s) => ({ service: s, hits: s.match.reduce((n, k) => n + (low.includes(k.toLowerCase()) ? (k.length > 4 ? 2 : 1) : 0), 0) }))
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}
