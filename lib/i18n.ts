import type { LangCode } from './types';

/* ===========================================================================
   THE LANGUAGE SYSTEM

   V1 shipped partial dictionaries with an English fallback, which is exactly
   how you end up with a Hindi screen containing English buttons.

   V2 removes the fallback. Every dictionary is typed `Dict`, which is a
   COMPLETE Record of every key. Miss one translation and `npm run build`
   fails with the missing key named. A mixed-language screen is now a
   compile error, not a bug report.
   =========================================================================== */

export const LANGUAGES: { code: LangCode; label: string; native: string; speech: string }[] = [
  { code: 'en', label: 'English',   native: 'English',  speech: 'en-IN' },
  { code: 'hi', label: 'Hindi',     native: 'हिन्दी',    speech: 'hi-IN' },
  { code: 'ta', label: 'Tamil',     native: 'தமிழ்',     speech: 'ta-IN' },
  { code: 'te', label: 'Telugu',    native: 'తెలుగు',    speech: 'te-IN' },
  { code: 'kn', label: 'Kannada',   native: 'ಕನ್ನಡ',     speech: 'kn-IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം',   speech: 'ml-IN' },
  { code: 'mr', label: 'Marathi',   native: 'मराठी',     speech: 'mr-IN' },
  { code: 'bn', label: 'Bengali',   native: 'বাংলা',     speech: 'bn-IN' },
  { code: 'gu', label: 'Gujarati',  native: 'ગુજરાતી',   speech: 'gu-IN' },
  { code: 'pa', label: 'Punjabi',   native: 'ਪੰਜਾਬੀ',    speech: 'pa-IN' },
];

const en = {
  /* app */
  'app.name': 'KaamSetu',
  'app.tagline': 'Trusted local workers, near you',

  /* common */
  'c.continue': 'Continue', 'c.back': 'Back', 'c.confirm': 'Confirm', 'c.cancel': 'Cancel',
  'c.yes': 'Yes', 'c.no': 'No', 'c.save': 'Save', 'c.send': 'Send', 'c.close': 'Close',
  'c.edit': 'Edit', 'c.done': 'Done', 'c.skip': 'Skip', 'c.search': 'Search', 'c.retry': 'Try again',
  'c.share': 'Share', 'c.call': 'Call', 'c.logout': 'Log out', 'c.or': 'or', 'c.all': 'All',
  'c.min': 'min', 'c.km': 'km', 'c.years': 'years', 'c.optional': 'optional', 'c.loading': 'Loading',

  /* navigation */
  'n.home': 'Home', 'n.search': 'Search', 'n.jobs': 'My jobs', 'n.messages': 'Messages',
  'n.profile': 'Profile', 'n.help': 'Help',

  /* roles + login */
  'a.choose': 'Who are you?',
  'a.worker': 'I want work',
  'a.workerD': 'Electrician, plumber, maid, driver, guard and more',
  'a.customer': 'I need a worker',
  'a.customerD': 'For my home or family',
  'a.society': 'Society / RWA',
  'a.societyD': 'Hire staff for an apartment or community',
  'a.business': 'Business owner',
  'a.businessD': 'Shop, store or small business',
  'a.demoTitle': 'Just looking around?',
  'a.demoDesc': 'Open a ready-made account. No sign-up needed.',
  'a.demoWorker': 'Demo worker', 'a.demoCustomer': 'Demo resident',
  'a.demoSociety': 'Demo society', 'a.demoBusiness': 'Demo business',
  'a.phoneTitle': 'Your mobile number',
  'a.phoneSub': 'We send a 6 digit code to check it is you',
  'a.phonePh': '10 digit mobile number',
  'a.sendCode': 'Send code',
  'a.otpTitle': 'Enter the code', 'a.otpSub': 'Code sent to',
  'a.otpDemo': 'Demo mode: the code is always 123456',
  'a.otpWrong': 'That code is not right. Try 123456.',
  'a.verify': 'Verify',
  'a.nameLabel': 'Your name', 'a.namePh': 'For example: Ramesh Kumar',
  'a.orgLabel': 'Name of your society or shop', 'a.orgPh': 'For example: Green Valley Apartments',

  /* home */
  'h.greeting': 'What do you need done?',
  'h.searchPh': 'Electrician, leaking tap, maid…',
  'h.speak': 'Speak instead',
  'h.popular': 'Common needs',
  'h.browse': 'All services',
  'h.myJobs': 'Your jobs',
  'h.iNeedWork': 'I am looking for work',
  'h.iNeedWorkD': 'Speak once. We build your profile free.',
  'h.viewAll': 'See all',
  'h.noJobs': 'No jobs yet',

  /* search */
  's.title': 'Search',
  's.resultsIn': 'workers in',
  's.none': 'No workers found here yet. Try another service or a wider area.',
  's.fAll': 'All', 's.fNear': 'Nearest', 's.fAvailable': 'Available now', 's.fVerified': 'Verified only',
  's.pickService': 'What exactly do you need?',
  's.back': 'All categories',

  /* worker card + profile */
  'w.verified': 'Aadhaar verified',
  'w.pending': 'Verification pending',
  'w.failed': 'Verification failed',
  'w.unverified': 'Not verified',
  'w.jobsDone': 'jobs completed',
  'w.reviews': 'Reviews',
  'w.experience': 'Experience',
  'w.speaks': 'Speaks',
  'w.away': 'away',
  'w.respondsIn': 'Usually replies in',
  'w.view': 'View profile',
  'w.hire': 'Hire',
  'w.callNow': 'Call',
  'w.whatsapp': 'WhatsApp',
  'w.noReviews': 'No reviews yet',
  'w.about': 'About',
  'w.services': 'What they do',
  'w.availability': 'Available',
  'w.share': 'Share this worker',

  /* worker onboarding */
  'o.lang': 'Which language do you want to use?',
  'o.langSub': 'The whole app will be in this language',
  'o.work': 'Tell me what work you do',
  'o.workSub': 'Press the button and speak normally. No forms.',
  'o.tapSpeak': 'Press and speak',
  'o.listening': 'Listening… speak now',
  'o.stop': 'Stop',
  'o.type': 'Type instead',
  'o.example': 'For example: I do electrical wiring and fan fitting, six years experience',
  'o.create': 'Make my profile',
  'o.understood': 'This is what I understood',
  'o.correct': 'Yes, this is right',
  'o.redo': 'No, let me say it again',
  'o.changeWork': 'Change the type of work',
  'o.where': 'Where do you work?',
  'o.radius': 'How far can you travel?',
  'o.when': 'When can you work?',
  'o.done': 'You are ready',
  'o.doneSub': 'Your profile is live. Nearby jobs will come to you.',
  'o.goJobs': 'See jobs near me',
  'o.noMic': 'Voice does not work in this browser. Please type instead.',

  /* aadhaar verification */
  'v.title': 'Verify your Aadhaar',
  'v.sub': 'Verified workers get up to 3 times more jobs. It takes one minute.',
  'v.ph': '12 digit Aadhaar number',
  'v.consent': 'I agree to KaamSetu checking my Aadhaar for identity verification only.',
  'v.now': 'Verify now',
  'v.later': 'Do this later',
  'v.checking': 'Checking with UIDAI…',
  'v.ok': 'Verified',
  'v.okSub': 'Your identity is confirmed. Customers can see your badge.',
  'v.fail': 'We could not verify this number',
  'v.failSub': 'Check the number and try again, or skip for now.',
  'v.privacy': 'We never store your Aadhaar number — only the last 4 digits.',
  'v.simNote': 'Demo build: verification is simulated, no real Aadhaar is checked.',

  /* availability + urgency */
  'av.today': 'Only today', 'av.weekdays': 'Monday to Friday', 'av.anytime': 'Any day',
  'u.emergency': 'Emergency', 'u.today': 'Today', 'u.this_week': 'This week', 'u.flexible': 'Any day',

  /* posting a job */
  'p.title': 'What do you need?',
  'p.sub': 'Speak or type in your own language',
  'p.ph': 'For example: fan is not working, need someone today',
  'p.find': 'Find workers',
  'p.askService': 'Which of these is it?',
  'p.askWhen': 'When should the worker come?',
  'p.askBudget': 'What budget do you have in mind?',
  'p.askWhere': 'Where is the work? Flat and building name.',
  'p.wherePh': 'For example: Flat 402, Green Valley',
  'p.budgetSkip': 'I am not sure — suggest a price',
  'p.review': 'Check before posting',
  'p.publish': 'Post this job',
  'p.estimate': 'Fair price for this work',
  'p.posted': 'Job posted',
  'p.postedSub': 'Nearby workers have been told. You will get replies shortly.',

  /* job + status */
  'j.draft': 'Not posted yet', 'j.open': 'Waiting for workers', 'j.assigned': 'Worker confirmed',
  'j.on_the_way': 'On the way', 'j.working': 'Work in progress', 'j.worker_done': 'Waiting for your confirmation',
  'j.completed': 'Completed', 'j.cancelled': 'Cancelled',
  'j.track': 'Track worker', 'j.navigate': 'Navigate', 'j.arrived': 'I have reached',
  'j.start': 'Start work', 'j.finish': 'Work finished', 'j.confirm': 'Yes, work is done',
  'j.accept': 'Accept this job', 'j.eta': 'Reaching in about',
  'j.address': 'Address', 'j.openMaps': 'Open in Maps',

  /* payment */
  'y.title': 'Payment', 'y.method': 'How will you pay?', 'y.agreed': 'Agreed amount',
  'y.pending': 'Not paid yet', 'y.paid': 'Paid', 'y.markPaid': 'Mark as paid', 'y.cash': 'Cash',

  /* chat */
  'm.title': 'Messages', 'm.ph': 'Write a message',
  'm.onWay': 'I am on my way', 'm.reached': 'I have reached', 'm.late': 'Running late',
  'm.callMe': 'Please call me', 'm.finished': 'Work is finished', 'm.ok': 'Okay',
  'm.voice': 'Voice note', 'm.recording': 'Recording… press to stop',
  'm.translated': 'Translated for you', 'm.original': 'Show original',
  'm.empty': 'No messages yet. Say hello.',

  /* SOS */
  'x.title': 'Emergency help',
  'x.sub': 'Only use this if you feel unsafe.',
  'x.hold': 'Press and hold for 2 seconds',
  'x.sent': 'Help is on the way',
  'x.sentSub': 'Your location was shared and support has been told.',
  'x.call112': 'Call 112 now',
  'x.shareLoc': 'Send my location on WhatsApp',
  'x.contact': 'Emergency contact',
  'x.contactSet': 'Add an emergency contact so we can reach someone you trust.',

  /* reviews */
  'r.title': 'How was the work?',
  'r.stars': 'Tap the stars',
  'r.write': 'Say a few words',
  'r.ph': 'For example: came on time and fixed it quickly',
  'r.punctual': 'On time', 'r.clean': 'Left it clean', 'r.skilled': 'Knew the work', 'r.polite': 'Polite',
  'r.submit': 'Send feedback',
  'r.thanks': 'Thank you. This helps your neighbours choose.',

  /* society + business */
  'g.socTitle': 'Society hiring',
  'g.socSub': 'Hire staff for your apartment or community',
  'g.socStaff': 'Our staff',
  'g.bizTitle': 'Business hiring',
  'g.bizSub': 'Hire helpers, delivery and cleaning staff for your shop',
  'g.hireFor': 'What do you need?',
  'g.duration': 'For how long?',
  'g.oneTime': 'One time', 'g.monthly': 'Every month', 'g.daily': 'Daily',
  'g.staffCount': 'How many people?',

  /* errors */
  'e.required': 'Please fill this in',
  'e.phone': 'Enter a valid 10 digit mobile number',
  'e.aadhaar': 'Enter a valid 12 digit Aadhaar number',
  'e.location': 'We could not get your location. Please pick your area.',
  'e.generic': 'Something went wrong. Please try again.',
} as const;

export type TKey = keyof typeof en;

/** COMPLETE dictionary. Missing a key here is a compile error, by design. */
export type Dict = Record<TKey, string>;

import { hi, ta, te, kn, ml } from './i18n-a';
import { mr, bn, gu, pa } from './i18n-b';

const DICTS: Record<LangCode, Dict> = { en, hi, ta, te, kn, ml, mr, bn, gu, pa };

export function t(lang: LangCode, key: TKey): string {
  return DICTS[lang][key];
}

export function makeT(lang: LangCode) {
  const d = DICTS[lang];
  return (key: TKey) => d[key];
}

export function langMeta(code: LangCode) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function speechLocale(code: LangCode): string {
  return langMeta(code).speech;
}

export function langNative(code: LangCode): string {
  return langMeta(code).native;
}

/** Used by the self-test to prove no language is missing or untranslated. */
export const ALL_KEYS = Object.keys(en) as TKey[];
export { en as ENGLISH, DICTS };
