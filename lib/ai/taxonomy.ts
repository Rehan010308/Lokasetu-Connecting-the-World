import type { CategoryId } from '../types';

export interface CategoryDef {
  id: CategoryId;
  /** Keywords across languages that indicate this category. Lowercased. */
  keywords: string[];
  /** Typical skills we can offer as chips. */
  commonSkills: string[];
  /** Base rate in INR used by the pricing engine. */
  baseRate: number;      // for a standard 1 hour visit
  hourlyRate: number;    // for each additional hour
  icon: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'electrician',
    icon: '⚡',
    baseRate: 250, hourlyRate: 200,
    keywords: [
      'electric', 'electrician', 'wiring', 'wire', 'fan', 'ceiling fan', 'light', 'bulb', 'tube',
      'switch', 'socket', 'plug', 'inverter', 'mcb', 'fuse', 'short circuit', 'geyser', 'ac',
      'बिजली', 'मिस्त्री', 'पंखा', 'वायरिंग', 'लाइट', 'स्विच', 'इन्वर्टर',
      'மின்', 'விசிறி', 'வயரிங்', 'விளக்கு',
      'కరెంట్', 'ఫ్యాన్', 'వైరింగ్', 'లైట్',
      'വൈദ്യുതി', 'ഫാൻ', 'വയറിംഗ്', 'ലൈറ്റ്',
      'ವಿದ್ಯುತ್', 'ಫ್ಯಾನ್', 'ವೈರಿಂಗ್', 'ಲೈಟ್',
    ],
    commonSkills: ['Wiring', 'Fan installation', 'Inverter repair', 'Switchboard', 'Lighting', 'Geyser fitting'],
  },
  {
    id: 'plumber',
    icon: '🔧',
    baseRate: 250, hourlyRate: 200,
    keywords: [
      'plumb', 'plumber', 'pipe', 'leak', 'leaking', 'tap', 'faucet', 'water', 'drain', 'blockage',
      'toilet', 'flush', 'basin', 'sink', 'motor', 'tank', 'overflow', 'bathroom',
      'नल', 'पाइप', 'पानी', 'लीक', 'प्लंबर', 'टंकी', 'बाथरूम',
      'குழாய்', 'தண்ணீர்', 'கசிவு', 'பைப்',
      'పైపు', 'నీరు', 'లీక్', 'ప్లంబర్', 'కుళాయి',
      'പൈപ്പ്', 'വെള്ളം', 'ചോർച്ച', 'പ്ലംബർ',
      'ಪೈಪ್', 'ನೀರು', 'ಸೋರಿಕೆ', 'ಪ್ಲಂಬರ್', 'ನಲ್ಲಿ',
    ],
    commonSkills: ['Leak repair', 'Tap fitting', 'Drain cleaning', 'Toilet repair', 'Motor & tank', 'Pipe laying'],
  },
  {
    id: 'carpenter',
    icon: '🪚',
    baseRate: 300, hourlyRate: 250,
    keywords: [
      'carpenter', 'wood', 'furniture', 'door', 'window', 'cupboard', 'wardrobe', 'shelf', 'table',
      'chair', 'bed', 'hinge', 'lock', 'drawer', 'modular',
      'बढ़ई', 'लकड़ी', 'दरवाजा', 'खिड़की', 'अलमारी', 'फर्नीचर',
      'தச்சர்', 'மரம்', 'கதவு', 'அலமாரி',
      'వడ్రంగి', 'కలప', 'తలుపు', 'అల్మారా',
      'ആശാരി', 'തടി', 'വാതിൽ', 'അലമാര',
      'ಬಡಗಿ', 'ಮರ', 'ಬಾಗಿಲು', 'ಕಪಾಟು',
    ],
    commonSkills: ['Door repair', 'Furniture making', 'Cupboard fitting', 'Lock & hinge', 'Modular work', 'Polishing'],
  },
  {
    id: 'painter',
    icon: '🎨',
    baseRate: 400, hourlyRate: 250,
    keywords: [
      'paint', 'painter', 'painting', 'whitewash', 'wall', 'putty', 'primer', 'emulsion', 'distemper',
      'पेंट', 'रंग', 'पुताई', 'दीवार', 'सफेदी',
      'வர்ணம்', 'பெயிண்ட்', 'சுவர்',
      'పెయింట్', 'రంగు', 'గోడ',
      'പെയിന്റ്', 'ചായം', 'ചുവർ',
      'ಪೇಂಟ್', 'ಬಣ್ಣ', 'ಗೋಡೆ',
    ],
    commonSkills: ['Interior painting', 'Exterior painting', 'Putty & primer', 'Texture work', 'Wood polish'],
  },
  {
    id: 'maid',
    icon: '🧹',
    baseRate: 300, hourlyRate: 150,
    keywords: [
      'maid', 'house help', 'housemaid', 'cleaning', 'clean', 'sweep', 'mop', 'utensil', 'dishes',
      'washing', 'laundry', 'domestic', 'bai', 'housekeeping',
      'साफ', 'सफाई', 'बर्तन', 'झाड़ू', 'पोछा', 'कामवाली', 'घरेलू',
      'சுத்தம்', 'பாத்திரம்', 'வீட்டு வேலை', 'துடைப்பம்',
      'శుభ్రం', 'పాత్రలు', 'ఇంటి పని', 'ఊడ్చడం',
      'വൃത്തി', 'പാത്രം', 'വീട്ടുജോലി',
      'ಸ್ವಚ್ಛ', 'ಪಾತ್ರೆ', 'ಮನೆಕೆಲಸ', 'ಗುಡಿಸು',
    ],
    commonSkills: ['Sweeping & mopping', 'Utensil washing', 'Laundry', 'Dusting', 'Bathroom cleaning', 'Deep cleaning'],
  },
  {
    id: 'cook',
    icon: '🍲',
    baseRate: 400, hourlyRate: 250,
    keywords: [
      'cook', 'cooking', 'chef', 'food', 'meal', 'kitchen', 'tiffin', 'breakfast', 'lunch', 'dinner',
      'north indian', 'south indian', 'roti', 'chapati',
      'खाना', 'रसोई', 'रसोइया', 'बनाना', 'रोटी',
      'சமையல்', 'உணவு', 'சமைக்க',
      'వంట', 'ఆహారం', 'వంటవాడు',
      'പാചകം', 'ഭക്ഷണം', 'അടുക്കള',
      'ಅಡುಗೆ', 'ಆಹಾರ', 'ಅಡುಗೆಮನೆ',
    ],
    commonSkills: ['North Indian', 'South Indian', 'Chapati & roti', 'Tiffin service', 'Party cooking', 'Jain / satvik'],
  },
  {
    id: 'barber',
    icon: '💈',
    baseRate: 150, hourlyRate: 150,
    keywords: [
      'barber', 'haircut', 'hair', 'shave', 'salon', 'beard', 'trim', 'grooming',
      'नाई', 'बाल', 'कटिंग', 'दाढ़ी', 'हजामत',
      'முடி', 'திருத்தம்', 'சவரம்',
      'క్షౌరం', 'జుట్టు', 'గడ్డం',
      'മുടി', 'ബാർബർ', 'ഷേവ്',
      'ಕ್ಷೌರ', 'ಕೂದಲು', 'ಗಡ್ಡ',
    ],
    commonSkills: ['Haircut', 'Shave', 'Beard trim', 'Kids haircut', 'Home service', 'Head massage'],
  },
  {
    id: 'raddiwala',
    icon: '♻️',
    baseRate: 0, hourlyRate: 0,
    keywords: [
      'scrap', 'raddi', 'raddiwala', 'kabadi', 'kabadiwala', 'newspaper', 'cardboard', 'waste',
      'recycle', 'old paper', 'bottles', 'plastic',
      'रद्दी', 'कबाड़', 'कबाड़ीवाला', 'अखबार', 'पुराना सामान',
      'பழைய பொருள்', 'பேப்பர்', 'குப்பை',
      'పాత సామాను', 'పేపర్', 'చెత్త',
      'ആക്രി', 'പേപ്പർ', 'പഴയ സാധനം',
      'ಗುಜರಿ', 'ಪೇಪರ್', 'ಹಳೆ ಸಾಮಾನು',
    ],
    commonSkills: ['Paper & cardboard', 'Plastic', 'Metal', 'E-waste', 'Doorstep pickup', 'Weighing on site'],
  },
  {
    id: 'shop_assistant',
    icon: '🏪',
    baseRate: 400, hourlyRate: 100,
    keywords: [
      'shop', 'store', 'helper', 'assistant', 'delivery', 'loading', 'counter', 'billing', 'stock',
      'दुकान', 'सहायक', 'हेल्पर', 'डिलीवरी',
      'கடை', 'உதவியாளர்',
      'దుకాణం', 'సహాయకుడు',
      'കട', 'സഹായി',
      'ಅಂಗಡಿ', 'ಸಹಾಯಕ',
    ],
    commonSkills: ['Counter help', 'Stock arranging', 'Billing', 'Local delivery', 'Loading & unloading'],
  },
  {
    id: 'other',
    icon: '🛠️',
    baseRate: 300, hourlyRate: 200,
    keywords: [],
    commonSkills: ['General help'],
  },
];

export function categoryById(id: CategoryId): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
