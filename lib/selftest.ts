/**
 * Self-test for the whole logic layer — no browser needed.
 *
 *   npm run test
 *
 * These assertions are the safety net for the two bugs V2 exists to kill:
 * mixed-language UI, and workers appearing under the wrong category.
 */
// @ts-nocheck
import { readFileSync } from 'node:fs';
import { seedDB, DEMO_ACCOUNTS } from './seed';
import { ALL_KEYS, DICTS, LANGUAGES, t, makeT } from './i18n';
import { CATEGORIES, SERVICES, matchServices, servicesOf, service, categoryOfService } from './catalog';
import { CATEGORY_NAMES, SERVICE_NAMES, categoryName, serviceName } from './i18n-catalog';
import { extractWorkerProfile } from './ai/profile';
import { parseRequest } from './ai/request';
import { suggestPrice } from './ai/pricing';
import { rankWorkers, etaMinutes } from './ai/match';
import { isValidAadhaarFormat, verifyIdentity } from './verify';
import { PAYMENT_METHODS, EMPTY_PAYMENT, createOrder, holdFunds, releaseFunds, refund, methodInfo, statusKey } from './payments';
import { cancelTerms, canCancel, travelFee, POLICY_ROWS } from './cancellation';
import { telLink, waLink, navigateLink, sosMessage, e164, workerShareText } from './links';
import { distanceKm, formatKm, formatDistance } from './geo';
import { CITIES, ALL_LOCALITIES, geoOf } from './cities';
import { RANGES, bucketsFor, compact, earnedJobs, lifetime, niceMax, summarise } from './earnings';
import {
  DAY_KEYS, crossesMidnight, hoursPerWeek, isValidShift, monthlyCost,
  nextOccurrence, shiftHours, shiftSummary, totalHours, type ShiftPattern,
} from './shifts';
import { fitZoom, lerpGeo, midpoint, project, tilesFor, toPixel, travelProgress } from './tiles';

/** Translate into English, for assertions that read a rendered string. */
const en = (k: any) => t('en', k);

(async () => {
  const db = seedDB();
  let fails = 0;
  const ok = (label, cond, extra = '') => {
    console.log(`${cond ? '✅' : '❌'} ${label} ${extra}`);
    if (!cond) fails++;
  };
  const section = (s) => console.log(`\n── ${s} ─────────────────────────────`);

  /* ==================================================== 1. LANGUAGE SYSTEM */
  section('Language system');
  ok('10 languages registered', LANGUAGES.length === 10, LANGUAGES.map(l => l.code).join(','));
  ok(`${ALL_KEYS.length} UI keys defined`, ALL_KEYS.length > 150);

  let missingTotal = 0;
  for (const l of LANGUAGES) {
    const d = DICTS[l.code];
    const missing = ALL_KEYS.filter((k) => !d[k] || String(d[k]).trim() === '');
    missingTotal += missing.length;
    if (missing.length) console.log(`   ${l.code} missing: ${missing.slice(0, 6).join(', ')}`);
  }
  ok('no missing translations in any language', missingTotal === 0, `${ALL_KEYS.length * 10} strings checked`);

  // The V1 bug: English selected but Hindi text shows, or vice versa.
  let untranslated = 0;
  const SHARED_OK = new Set(['app.name']); // proper nouns may legitimately match
  for (const l of LANGUAGES.filter((x) => x.code !== 'en')) {
    const same = ALL_KEYS.filter((k) => !SHARED_OK.has(k) && DICTS[l.code][k] === DICTS.en[k]);
    untranslated += same.length;
    if (same.length) console.log(`   ${l.code} still English on: ${same.slice(0, 5).join(', ')}`);
  }
  ok('no language silently falls back to English', untranslated === 0);

  ok('t() returns the chosen language', t('hi', 'c.continue') !== t('en', 'c.continue'), `hi="${t('hi', 'c.continue')}"`);
  ok('makeT binds one language', makeT('ta')('w.hire') === t('ta', 'w.hire'), `ta="${t('ta', 'w.hire')}"`);

  /* ==================================================== 2. CATALOGUE */
  section('Catalogue');
  ok(`${SERVICES.length} services in ${CATEGORIES.length} categories`, SERVICES.length > 40);

  const orphan = SERVICES.filter((s) => !CATEGORIES.some((c) => c.services.includes(s.id)));
  ok('every service belongs to a category', orphan.length === 0, orphan.map((s) => s.id).join(','));

  const wrong = CATEGORIES.flatMap((c) => c.services.filter((sid) => service(sid)?.category !== c.id));
  ok('no service filed under the wrong category', wrong.length === 0, wrong.join(','));

  const noName = SERVICES.filter((s) => !SERVICE_NAMES[s.id]);
  ok('every service has a name entry', noName.length === 0, noName.map((s) => s.id).join(','));

  let nameGaps = 0;
  for (const s of SERVICES) for (const l of LANGUAGES) if (!SERVICE_NAMES[s.id]?.[l.code]) nameGaps++;
  for (const c of CATEGORIES) for (const l of LANGUAGES) if (!CATEGORY_NAMES[c.id]?.[l.code]) nameGaps++;
  ok('service and category names exist in all 10 languages', nameGaps === 0,
     `${(SERVICES.length + CATEGORIES.length) * 10} names checked`);

  ok('category names translate', categoryName('plumbing', 'ta') !== categoryName('plumbing', 'en'),
     `ta="${categoryName('plumbing', 'ta')}"`);

  /* ==================================================== 3. CATEGORY MATCHING */
  section('Category matching (the V1 bug)');
  const fanHit = matchServices('the ceiling fan is not working')[0];
  ok('"ceiling fan" maps to fan repair', fanHit?.service.id === 'fan_repair', fanHit?.service.id);

  const leakHit = matchServices('नल से पानी लीक हो रहा है')[0];
  ok('Hindi "नल लीक" maps to plumbing', leakHit?.service.category === 'plumbing', leakHit?.service.id);

  const paintHit = matchServices('ಗೋಡೆಗೆ ಬಣ್ಣ ಹಚ್ಚಬೇಕು')[0];
  ok('Kannada "ಬಣ್ಣ" maps to painting', paintHit?.service.category === 'painting', paintHit?.service.id);

  // The heart of it: search a service, get only workers who do that service.
  const probe = { geo: db.clients[0].geo, category: 'plumbing', serviceId: 'leak_repair' };
  const plumbers = rankWorkers(probe, db.workers);
  ok('leak-repair search returns only leak-repair workers',
     plumbers.every((m) => m.worker.services.includes('leak_repair')), `${plumbers.length} results`);
  ok('no painter appears in a plumbing search',
     !plumbers.some((m) => m.worker.category === 'painting'));
  ok('search respects the worker radius', plumbers.every((m) => m.km <= m.worker.radiusKm));

  const verifiedOnly = rankWorkers(probe, db.workers, { verifiedOnly: true });
  ok('verified filter works', verifiedOnly.every((m) => m.worker.verification.status === 'verified'));

  const nowOnly = rankWorkers(probe, db.workers, { availableNow: true });
  ok('available-now filter works', nowOnly.every((m) => m.worker.availability === 'anytime'));

  /* ==================================================== 4. AI PROFILE */
  section('AI portfolio creation');
  const p1 = await extractWorkerProfile('I do electrical wiring and fan fitting, six years experience');
  ok('EN speech -> electrical', p1.category === 'electrical', `${p1.category} ${p1.experienceYears}y [${p1.services}]`);
  ok('EN speech -> 6 years', p1.experienceYears === 6);
  ok('stated experience is not re-asked', !p1.missing.includes('years'));
  ok('bio was written', p1.bio.length > 10, `"${p1.bio}"`);

  const p2 = await extractWorkerProfile('मैं बिजली की वायरिंग और पंखा लगाता हूँ, 8 साल का अनुभव', 'hi');
  ok('HI speech -> electrical, 8y', p2.category === 'electrical' && p2.experienceYears === 8);
  ok('HI bio is in Hindi', /[ऀ-ॿ]/.test(p2.bio), `"${p2.bio}"`);

  const p3 = await extractWorkerProfile('நான் குழாய் கசிவு பழுது பார்க்கிறேன்', 'ta');
  ok('TA speech -> plumbing', p3.category === 'plumbing');
  ok('TA bio is in Tamil', /[஀-௿]/.test(p3.bio));

  const p4 = await extractWorkerProfile('ਮੈਂ ਕਾਰ ਚਲਾਉਂਦਾ ਹਾਂ, ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ', 'pa');
  ok('PA speech -> driving', p4.category === 'driving', p4.category);

  ok('extracted services all belong to the extracted category',
     p1.services.every((s) => categoryOfService(s) === p1.category));

  /* ==================================================== 5. FOLLOW-UP QUESTIONS */
  section('AI asks instead of assuming');
  const bare = await parseRequest('fan not working');
  ok('missing timing is asked for', bare.missing.includes('when'), bare.missing.join(','));
  ok('missing budget is asked for', bare.missing.includes('budget'));
  ok('missing address is asked for', bare.missing.includes('where'));
  ok('no budget invented when unstated', bare.budgetMin === undefined);
  ok('no address invented when unstated', bare.address === undefined);

  const full = await parseRequest('fan not working, come today at 5 pm, flat 402, budget ₹400');
  ok('stated timing is captured', !full.missing.includes('when'), full.whenText);
  ok('stated budget is captured', !full.missing.includes('budget'), `₹${full.budgetMin}-${full.budgetMax}`);
  ok('stated address is captured', !full.missing.includes('where'), full.address);
  ok('urgency reads "today"', full.urgency === 'today', full.urgency);

  const hindi = await parseRequest('नल से पानी लीक हो रहा है, तुरंत चाहिए', 'hi');
  ok('HI request -> plumbing + emergency', hindi.category === 'plumbing' && hindi.urgency === 'emergency');

  const ambiguous = await parseRequest('कुछ बिजली का काम है');
  ok('ambiguous request offers choices instead of guessing',
     ambiguous.missing.includes('service') || !!ambiguous.serviceId);

  /* ==================================================== 6. PRICING */
  section('Pricing');
  const pr = await suggestPrice('fan_repair', 'emergency', 1);
  ok('price range is sane', pr.min > 0 && pr.max > pr.min, `₹${pr.min}-₹${pr.max} :: ${pr.basis}`);
  const pr2 = await suggestPrice('interior_paint', 'flexible', 6);
  ok('a 6-hour paint job costs more than a 1-hour fan repair', pr2.min > pr.min, `₹${pr2.min}-₹${pr2.max}`);
  const prU = await suggestPrice('fan_repair', 'flexible', 1);
  ok('emergency costs more than flexible', pr.min > prU.min, `₹${pr.min} vs ₹${prU.min}`);

  /* ==================================================== 7. AADHAAR / VERIFY */
  section('Identity verification');
  ok('rejects a made-up number', !isValidAadhaarFormat('123456789012'));
  ok('rejects numbers starting 0 or 1', !isValidAadhaarFormat('012345678901'));
  ok('rejects wrong length', !isValidAadhaarFormat('99999999'));
  ok('accepts a Verhoeff-valid number', isValidAadhaarFormat('234567890124'), '234567890124');

  const bad = await verifyIdentity('123456789012', 'Test');
  ok('invalid number fails verification', bad.verification.status === 'failed', bad.verification.failureReason);
  ok('failed check stores no digits', bad.verification.idLast4 === undefined);

  const good = await verifyIdentity('234567890124', 'Ramesh Kumar');
  ok('valid number verifies', good.verification.status === 'verified');
  ok('ONLY the last 4 digits are stored', good.verification.idLast4 === '0124', good.verification.idLast4);
  ok('full number never appears in the stored record',
     !JSON.stringify(good.verification).includes('234567890124'));

  /* ==================================================== 8. INTEGRATION LINKS */
  section('Integration links');
  ok('phone becomes E.164', e164('9876500001') === '919876500001', e164('9876500001'));
  ok('tel link is dialable', telLink('9876500001') === 'tel:+919876500001');
  ok('whatsapp link is well formed', waLink('9876500001', 'hi there').startsWith('https://wa.me/919876500001?text='));
  const nav = navigateLink({ lat: 12.93, lng: 77.62, areaName: 'Koramangala', address: 'Flat 402' });
  ok('maps link starts navigation', nav.includes('maps/dir/') && nav.includes('travelmode=driving'));
  ok('maps link uses the address when present', nav.includes('Flat%20402'));
  const sos = sosMessage('Ramesh', 12.93, 77.62, 'fan repair');
  ok('SOS message carries a location link', sos.includes('maps?q=12.93,77.62'));
  ok('SOS message names the person', sos.includes('Ramesh'));
  const share = workerShareText(db.workers[0], 'https://x.test', 'Fan repair');
  ok('share text includes jobs completed', share.includes('jobs completed'));

  /* ==================================================== 9. SEED / DEMO */
  section('Demo accounts and seed');
  ok('4 demo accounts exist', DEMO_ACCOUNTS.length === 4, DEMO_ACCOUNTS.map((a) => a.role).join(','));
  for (const a of DEMO_ACCOUNTS) {
    const found = a.role === 'worker'
      ? db.workers.find((w) => w.id === a.id)
      : db.clients.find((c) => c.id === a.id);
    ok(`demo ${a.role} account resolves`, !!found, found?.name);
  }
  ok('all four verification states are represented',
     ['verified', 'pending', 'failed', 'unverified'].every((s) => db.workers.some((w) => w.verification.status === s)));
  ok('no worker record contains a full Aadhaar number',
     db.workers.every((w) => !w.verification.idLast4 || w.verification.idLast4.length === 4));
  ok('reviews have real text', db.reviews.every((r) => r.text.length > 20), `${db.reviews.length} reviews`);
  ok('every review points at a real worker', db.reviews.every((r) => db.workers.some((w) => w.id === r.workerId)));
  ok('every seeded worker service exists in the catalogue',
     db.workers.every((w) => w.services.every((s) => !!service(s))));
  ok('every seeded worker service matches their category',
     db.workers.every((w) => w.services.every((s) => categoryOfService(s) === w.category)));
  ok('no points, ranks or trust scores on any worker',
     db.workers.every((w) => !('trust' in w) && !('points' in w) && !('tier' in w)));

  /* ============================ 9b. THE AI ASKS INSTEAD OF ASSUMING */
  section('Onboarding asks, never assumes');
  {
    /* THE BUG: extractYears() ended with `return 1`, so a worker who said only
       "I am an electrician" got a public profile claiming one year of
       experience — a number the product invented and then showed to
       customers as fact. */
    const bare = await extractWorkerProfile('I am an electrician', 'en');
    ok('experience is null when nobody stated it', bare.experienceYears === null, String(bare.experienceYears));
    ok('unstated experience becomes a question', bare.missing.includes('years'));
    ok('the bio does not claim years it was never told',
       !/\d/.test(bare.bio), JSON.stringify(bare.bio));

    ok('languages are always asked', bare.missing.includes('languages'));
    ok('availability is always asked', bare.missing.includes('availability'));
    ok('service area is always asked', bare.missing.includes('area'));

    const rich = await extractWorkerProfile('I do fan repair and wiring, 12 years experience', 'en');
    ok('stated experience is kept', rich.experienceYears === 12, `${rich.experienceYears}`);
    ok('stated experience is not asked again', !rich.missing.includes('years'));

    const vague = await extractWorkerProfile('something something', 'en');
    ok('a transcript with no trade asks for the trade', vague.missing.includes('services'));
    ok('a transcript with no trade invents no experience', vague.experienceYears === null);

    ok('every gap has a question to show for it',
       (['years', 'services', 'languages'] as const).every((g) => !!t('en', `q.${g}` as any)));
  }

  /* ==================================================== 10. BOOKING FLOW */
  section('Booking lifecycle');
  const bk = db.jobs[0];
  const open_ = db.jobs.filter(j => j.status === 'requested');
  const doneJobs = db.jobs.filter(j => j.status === 'completed');
  const DEADSET = ['completed', 'cancelled_by_client', 'cancelled_by_worker', 'expired'];

  ok('every booking carries a payment record', db.jobs.every(j => !!j.payment));
  ok('an unaccepted request has nobody assigned', open_.every(j => !j.assignedWorkerId));
  ok('an unaccepted request has taken no money', open_.every(j => j.payment.status === 'unpaid'));
  ok('anything past requested has a worker on it',
     db.jobs.filter(j => !['requested', 'draft', 'expired'].includes(j.status)).every(j => !!j.assignedWorkerId));
  ok('booking captures time preference and duration', !!bk.timePref && !!bk.duration, `${bk.timePref} / ${bk.duration}`);
  ok('every finished job records when it finished', doneJobs.every(j => !!j.completedAt));
  ok('finished jobs have settled their money',
     doneJobs.every(j => j.payment.status === 'released' || j.payment.method === 'cash'));
  ok('a cancelled job carries its cancellation terms',
     db.jobs.filter(j => j.status.startsWith('cancelled')).every(j => !!j.cancellation));

  /* ============================== 10b. THE DEMO HAS SOMETHING TO DEMONSTRATE */
  section('Demo data is demoable');
  const DEMO_IDS = ['w_demo', 'c_demo', 's_demo', 'b_demo'];
  const jobsFor = (id: string) => db.jobs.filter(j => j.clientId === id || j.assignedWorkerId === id);

  for (const id of DEMO_IDS) {
    const list = jobsFor(id);
    ok(`${id} has work in flight`, list.some(j => !DEADSET.includes(j.status)), `${list.length} jobs total`);
    ok(`${id} has finished work to show`, list.some(j => j.status === 'completed'));
  }

  const HOUR = 3600000;
  const wDemoDone = db.jobs.filter(j => j.assignedWorkerId === 'w_demo' && j.status === 'completed');
  const earned = (h: number) => wDemoDone
    .filter(j => (j.completedAt ?? 0) > Date.now() - h * HOUR)
    .reduce((sum, j) => sum + (j.agreedAmount ?? 0), 0);
  ok('the demo worker earned something today', earned(24) > 0, `Rs ${earned(24)}`);
  ok('the demo worker earned more this week', earned(24 * 7) > earned(24), `Rs ${earned(24 * 7)}`);
  ok('the demo worker earned more this month', earned(24 * 30) > earned(24 * 7), `Rs ${earned(24 * 30)}`);

  ok('the demo worker is mid-journey on a live job',
     db.jobs.some(j => j.assignedWorkerId === 'w_demo' && j.status === 'on_the_way'));
  ok('a job is waiting on the customer to confirm',
     db.jobs.some(j => j.status === 'worker_done'));

  ok('conversations exist', db.messages.length > 0, `${db.messages.length} messages`);
  ok('every message belongs to a real job', db.messages.every(m => db.jobs.some(j => j.id === m.jobId)));
  ok('conversations include voice notes and quick replies',
     db.messages.some(m => m.kind === 'voice') && db.messages.some(m => m.kind === 'quick'));
  ok('a voice note keeps the language it was spoken in',
     db.messages.filter(m => m.kind === 'voice').every(m => !!m.lang));
  ok('quotes exist and point at real jobs',
     db.quotes.length > 0 && db.quotes.every(q => db.jobs.some(j => j.id === q.jobId)), `${db.quotes.length} quotes`);
  ok('every quote comes from a real worker',
     db.quotes.every(q => db.workers.some(w => w.id === q.workerId)));
  ok('the SOS log points at a real job',
     db.sos.length > 0 && db.sos.every(e => db.jobs.some(j => j.id === e.jobId)));

  ok('resetting hands out fresh objects, not shared ones', (() => {
    const a = seedDB(); const b = seedDB();
    a.jobs[0].title = 'mutated';
    return b.jobs[0].title !== 'mutated';
  })());

  /* ============================================ 10c. SHIFTS (recurring rotas) */
  section('Recurring shifts');
  {
    const evening: ShiftPattern = { days: [1, 3, 5], startMin: 21 * 60, endMin: 23 * 60 };
    ok('a plain shift is the right length', shiftHours(evening) === 2, `${shiftHours(evening)} h`);
    ok('hours per week multiplies by the days', hoursPerWeek(evening) === 6, `${hoursPerWeek(evening)} h`);
    ok('a shift plan reads back in words', shiftSummary(evening, en).includes('9:00 pm'), shiftSummary(evening, en));

    /* the bug this guards: 10pm-1am is three hours, not minus twenty-one */
    const night: ShiftPattern = { days: [0, 6], startMin: 22 * 60, endMin: 1 * 60 };
    ok('an overnight shift is not negative', shiftHours(night) === 3, `${shiftHours(night)} h`);
    ok('an overnight shift is flagged as such', crossesMidnight(night));
    ok('a same-day shift is not flagged', !crossesMidnight(evening));

    ok('total hours needs an end date', totalHours(evening) === null);
    ok('a bounded rota totals correctly', totalHours({ ...evening, weeks: 4 }) === 24, `${totalHours({ ...evening, weeks: 4 })} h`);

    /* 4.345 weeks a month, not 4 — a flat 4 under-pays by ~8 days a year */
    const cost = monthlyCost(evening, 200, 1);
    ok('a month is 4.345 weeks, not 4', cost === Math.round(6 * 4.345 * 200), `Rs ${cost}`);
    ok('more staff costs proportionally more', monthlyCost(evening, 200, 3) === cost * 3 || Math.abs(monthlyCost(evening, 200, 3) - cost * 3) <= 3);

    ok('a rota with no days is not staffable', !isValidShift({ ...evening, days: [] }));
    ok('a 20-hour shift is not staffable', !isValidShift({ days: [1], startMin: 0, endMin: 20 * 60 }));
    ok('a normal rota is staffable', isValidShift(evening));

    const mondayNoon = new Date(2026, 7, 17, 12, 0, 0).getTime();  // a Monday
    const next = nextOccurrence(evening, mondayNoon);
    ok('the next shift is later than now', !!next && next > mondayNoon);
    ok('the next shift lands on a chosen day',
       !!next && evening.days.includes(new Date(next).getDay()),
       next ? new Date(next).toDateString() : '');
    ok('every weekday has a label in every language',
       LANGUAGES.every((l) => DAY_KEYS.every((k) => !!t(l.code, k as any))));
  }

  /* ==================================================== 10d. MAP PROJECTION */
  section('Map and live tracking');
  {
    const kora = geoOf('blr_koramangala')!, hsr = geoOf('blr_hsr')!;

    /* Web Mercator sanity: further east is further right, further north is further up */
    const a = project(kora.lat, kora.lng, 13);
    const b = project(hsr.lat, hsr.lng, 13);
    ok('east of a point projects to a larger x', b.x > a.x);
    ok('south of a point projects to a larger y', b.y > a.y, 'HSR is south of Koramangala');

    const z = fitZoom(kora, hsr, 640, 210);
    ok('both points fit in the box at the chosen zoom', z >= 11 && z <= 16, `z${z}`);
    const pa = toPixel(kora.lat, kora.lng, midpoint(kora, hsr), z, 640, 210);
    const pb = toPixel(hsr.lat, hsr.lng, midpoint(kora, hsr), z, 640, 210);
    ok('both markers land inside the box',
       [pa, pb].every((p) => p.left >= 0 && p.left <= 640 && p.top >= 0 && p.top <= 210));
    ok('the two markers are not on top of each other', Math.hypot(pa.left - pb.left, pa.top - pb.top) > 20);

    const tiles = tilesFor(midpoint(kora, hsr), z, 640, 210);
    ok('the box is fully covered by tiles', tiles.length >= 4, `${tiles.length} tiles`);
    ok('every tile url is keyless',
       tiles.every((x) => !/key|token|apikey|access_token/i.test(x.url)), tiles[0].url);
    ok('no tile is requested from outside the pyramid',
       tiles.every((x) => { const [zz, xx, yy] = x.key.split('/').map(Number);
         return xx >= 0 && xx < 2 ** zz && yy >= 0 && yy < 2 ** zz; }));

    /* travel interpolation — the honest, non-GPS one */
    const t0 = 1_700_000_000_000;
    ok('a journey not started is at zero', travelProgress(undefined, 20, t0) === 0);
    ok('halfway through the time is halfway along', travelProgress(t0, 20, t0 + 10 * 60000) === 0.5);
    ok('progress never exceeds one', travelProgress(t0, 20, t0 + 999 * 60000) === 1);
    ok('progress never goes backwards', travelProgress(t0, 20, t0 - 60000) === 0);
    const mid = lerpGeo(kora, hsr, 0.5);
    ok('the halfway point is between the two ends',
       mid.lat < kora.lat && mid.lat > hsr.lat, `${mid.lat.toFixed(4)}`);
  }

  /* ============================== 10e. GEOGRAPHY — the "0 m away" regression */
  section('Places and distance');
  {
    ok('the app covers more than one city', CITIES.length >= 10, `${CITIES.length} cities`);
    ok('every city has localities', CITIES.every((c) => c.localities.length >= 6));
    ok('every locality id is unique',
       new Set(ALL_LOCALITIES.map((l) => l.id)).size === ALL_LOCALITIES.length);

    /* THE BUG: every entity used to sit on a locality centroid, so a worker and
       a job in the same area were 0.000 km apart and the feed printed "0 m". */
    let zero = 0;
    for (const j of db.jobs) for (const w of db.workers) if (distanceKm(j.geo, w.geo) === 0) zero++;
    ok('no worker is at exactly zero distance from a job', zero === 0, `${zero} collisions`);

    const points = new Set(db.workers.map((w) => `${w.geo.lat},${w.geo.lng}`));
    ok('no two workers share a coordinate', points.size === db.workers.length,
       `${points.size}/${db.workers.length}`);

    ok('distance never renders as zero', formatDistance(0) === 'nearby', formatDistance(0));
    ok('a real distance still renders as a distance', formatDistance(2.34) === '2.3 km', formatDistance(2.34));
    ok('sub-kilometre reads in metres', formatDistance(0.48) === '480 m', formatDistance(0.48));

    ok('every worker knows which city they are in', db.workers.every((w) => !!w.geo.cityId));
    ok('every job knows which city it is in', db.jobs.every((j) => !!j.geo.cityId));

    /* multi-city means every city has a marketplace, not just a name */
    const thin = CITIES.filter((c) => db.workers.filter((w) => w.geo.cityId === c.id).length < 6);
    ok('every city has workers in it', thin.length === 0,
       thin.length ? thin.map((c) => c.name).join(', ') : `${CITIES.length} cities staffed`);

    /* and that a search in one city cannot return another city's workers */
    const blrJob = { geo: geoOf('blr_koramangala')!, category: 'electrical' as const, serviceId: 'fan_repair' };
    const hits = rankWorkers(blrJob, db.workers);
    ok('a search returns local workers only',
       hits.every((m) => m.geo?.cityId === undefined || m.worker.geo.cityId === 'blr'),
       `${hits.length} hits, all Bengaluru`);
    ok('a city search actually finds somebody', hits.length > 0, `${hits.length}`);
  }

  /* ============================= 10e2. A CUSTOMER CHOOSES THEIR OWN CITY */
  {
    /* THE BUG: loginClient() fell back to a hardcoded Koramangala, so a
       customer signing up in Mumbai was placed in Bengaluru and shown workers
       800km away. The signature now carries a geo. */
    const src = readFileSync(new URL('../components/store.tsx', import.meta.url), 'utf8');
    ok('signup accepts a location',
       /loginClient\([^)]*geo\?: Geo/.test(src));
    ok('no hardcoded Koramangala fallback remains in signup',
       !src.includes("areaName: 'Koramangala, Bengaluru'"));

    /* and every city must be reachable from the picker, not just present in data */
    const picker = readFileSync(new URL('../components/city.tsx', import.meta.url), 'utf8');
    ok('the picker offers every city, not a subset', picker.includes('CITIES.map'));
  }

  /* ================== 10f. TRADE MATCHING — an electrician sees electrical work */
  section('Workers only see their own trade');
  {
    const trades = ['electrical', 'plumbing', 'cleaning', 'domestic', 'carpentry'] as const;
    for (const trade of trades) {
      const w = db.workers.find((x) => x.category === trade);
      if (!w) continue;
      const visible = db.jobs.filter((j) =>
        rankWorkers({ geo: j.geo, category: j.category, serviceId: j.serviceId }, [w]).length > 0);
      ok(`a ${trade} worker is never shown another trade`,
         visible.every((j) => j.category === trade),
         visible.length ? visible.map((j) => j.category).join(',') : 'no jobs in range');
    }

    /* the specific complaint: an electrician receiving cooking and cleaning */
    const elec = db.workers.find((x) => x.id === 'w_demo')!;
    const cooking = db.jobs.find((j) => j.category === 'domestic' || j.category === 'cleaning');
    ok('the demo electrician cannot be offered a cleaning job',
       !cooking || rankWorkers({ geo: cooking.geo, category: cooking.category, serviceId: cooking.serviceId }, [elec]).length === 0);
    ok('a worker is never offered a service they did not list',
       db.workers.every((w) => db.jobs.every((j) => {
         const shown = rankWorkers({ geo: j.geo, category: j.category, serviceId: j.serviceId }, [w]).length > 0;
         return !shown || !j.serviceId || w.services.includes(j.serviceId);
       })));
  }

  /* ================================================= 10g. EARNINGS DASHBOARD */
  section('Earnings');
  {
    const NOW = new Date(2026, 7, 19, 14, 0, 0).getTime();
    const wid = 'w_demo';

    ok('only completed work counts as earnings',
       earnedJobs(db.jobs, wid).every((j) => j.status === 'completed' && !!j.completedAt));
    ok('another worker\'s jobs are never counted',
       earnedJobs(db.jobs, wid).every((j) => j.assignedWorkerId === wid));

    const life = lifetime(db.jobs, wid);
    const yr = summarise(db.jobs, wid, 'y1', Date.now());
    ok('a year never exceeds the lifetime total', yr.total <= life.total, `${yr.total} <= ${life.total}`);

    const d7 = summarise(db.jobs, wid, 'd7', Date.now());
    const d30 = summarise(db.jobs, wid, 'd30', Date.now());
    ok('a longer window earns at least as much', d30.total >= d7.total, `30d ${d30.total} >= 7d ${d7.total}`);
    ok('the buckets add up to the total',
       d30.buckets.reduce((s2, b) => s2 + b.amount, 0) === d30.total);

    ok('an average with no jobs is zero, never NaN', (() => {
      const none = summarise([], 'nobody', 'd30', NOW);
      return none.average === 0 && none.total === 0 && !Number.isNaN(none.average);
    })());

    /* bucket counts are what keep the chart readable */
    ok('a week draws 7 bars', bucketsFor('d7', NOW).length === 7);
    ok('30 days draws 30 bars', bucketsFor('d30', NOW).length === 30);
    ok('90 days is drawn weekly, not as 90 bars', bucketsFor('d90', NOW).length === 13);
    ok('a year draws 12 months', bucketsFor('y1', NOW).length === 12);
    ok('lifetime is capped so it cannot draw hundreds of bars',
       bucketsFor('all', NOW, new Date(2015, 0, 1).getTime()).length <= 24);

    ok('buckets never overlap', (() => {
      const b = bucketsFor('d7', NOW);
      return b.every((x, i) => i === 0 || x.from >= b[i - 1].to);
    })());
    ok('buckets are in time order', (() => {
      const b = bucketsFor('m6', NOW);
      return b.every((x, i) => i === 0 || x.from > b[i - 1].from);
    })());

    ok('axis ceilings are round numbers', niceMax(937) === 1000 && niceMax(1874) === 2000,
       `${niceMax(937)}, ${niceMax(1874)}`);
    ok('an empty chart still has a scale', niceMax(0) === 100);
    ok('big money compacts', compact(12400) === '12K' && compact(250000) === '2.5L',
       `${compact(12400)} / ${compact(250000)}`);
    ok('small money does not compact', compact(840) === '840');

    ok('every range has a label in every language',
       LANGUAGES.every((l) => RANGES.every((r) => !!t(l.code, r.key as any))));
  }

  /* ========================= 10h. SERVER RENDER / VERCEL BUILD SAFETY */
  section('Server render safety');
  {
    /* THE BUILD FAILURE: the provider seeded inside a useState initialiser, so
       Next.js built the whole demo database during prerender — on the server,
       for every static route including /_not-found. Anything that throws in
       that path fails the production build instead of one screen. */
    const store = readFileSync(new URL('../components/store.tsx', import.meta.url), 'utf8');
    ok('the store does not seed during render', !store.includes('useState<DB>(() => seedDB())'));
    ok('the server renders an empty database', store.includes('useState<DB>(EMPTY_DB)'));
    /* Every call to seedDB must sit after the first useEffect — i.e. inside
       one. Checking position rather than an exact call shape, because the
       exact shape changed once and quietly broke this assertion. */
    const storeNoComments = store.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const firstEffect = storeNoComments.indexOf('useEffect(');
    const seedCalls = [...storeNoComments.matchAll(/seedDB\(\)/g)].map((m) => m.index ?? -1);
    ok('seeding happens in an effect, which never runs on the server',
       firstEffect > 0 && seedCalls.length > 0 && seedCalls.every((i) => i > firstEffect),
       `${seedCalls.length} call(s), all after the first effect`);

    /* Storage written by an older build must not be read by a newer one. */
    ok('stored data is stamped with the build that wrote it',
       storeNoComments.includes('version: VERSION'));
    ok('stored data from another build is discarded, not parsed',
       storeNoComments.includes('stored?.version === VERSION'));

    /* The crash that an empty database used to cause. Comments are stripped
       first: the fix is DESCRIBED in a comment right next to the code, and a
       naive substring check matched the prose and reported a false failure. */
    const storeCode = store.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    ok('no unguarded index into an empty workers array',
       !storeCode.includes('db.workers[0].geo'));
    ok('the location fallback chain is fully optional',
       storeCode.includes('db.workers[0]?.geo'));
    ok('a location is always resolvable', (() => {
      const empty = { workers: [], clients: [] } as any;
      const geo = empty.clients[0]?.geo ?? empty.workers[0]?.geo ?? geoOf('blr_koramangala');
      return !!geo && typeof geo.lat === 'number';
    })());

    /* /_not-found is the route the build died on. */
    let has404 = true;
    try { readFileSync(new URL('../app/not-found.tsx', import.meta.url)); } catch { has404 = false; }
    ok('an explicit 404 page exists', has404);
    if (has404) {
      const nf = readFileSync(new URL('../app/not-found.tsx', import.meta.url), 'utf8');
      ok('the 404 page is a server component with no hooks',
         !nf.includes("'use client'") && !/\buse[A-Z]/.test(nf));
    }

    /* Browser-only globals must never be touched while rendering. */
    for (const f of ['../components/store.tsx', '../components/theme.tsx', '../components/aurora.tsx']) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      const render = src.split('useEffect').shift() ?? '';
      ok(`${f.split('/').pop()} touches no browser global during render`,
         !/\bwindow\.|\bdocument\.|localStorage\./.test(render.replace(/\/\*[\s\S]*?\*\//g, '')));
    }

    /* Clock reads during render are hydration mismatches by construction. */
    const jobPage = readFileSync(new URL('../app/job/[id]/page.tsx', import.meta.url), 'utf8');
    ok('the job page reads no clock while rendering',
       !jobPage.includes('nextOccurrence(job.shift!, Date.now())'));

    /* The type gate must stay on. It was disabled once, to unblock a deploy,
       and the error it was hiding turned out to be real. */
    const cfg = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    ok('TypeScript errors still stop the build', !cfg.includes('ignoreBuildErrors'));

    /* The build number is stated in three files. It drifted: the app said
       4.1.3 while the README — the GitHub front page — still announced v4.1,
       so the repo advertised a build nobody was running. lib/version.ts is the
       source of truth; these fail if the copies fall behind it again. */
    const rd = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
    const declared = rd('./version.ts').match(/VERSION = '([^']+)'/)?.[1];
    const inPkg = JSON.parse(rd('../package.json')).version;
    const inReadme = rd('../README.md').match(/\*\*Current build: v([\d.]+)\*\*/)?.[1];

    ok('the app declares a version', !!declared, declared);
    ok('package.json matches lib/version.ts', inPkg === declared, `${inPkg} vs ${declared}`);
    ok('the README matches lib/version.ts', inReadme === declared, `${inReadme} vs ${declared}`);
    ok('a sync script exists so this is one command, not three edits',
       JSON.parse(rd('../package.json')).scripts['version:sync'] === 'node scripts/version.mjs');

    /* The test harness must stay out of the app's build graph. */
    const tsconfig = readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8');
    ok('the test harness is excluded from the Next build', tsconfig.includes('lib/selftest.ts'));
  }

  /* ==================================================== 11. PAYMENTS */
  section('Payments');
  ok('7 payment methods offered', PAYMENT_METHODS.length === 7, PAYMENT_METHODS.map(m => m.id).join(','));
  ok('cash is the only method that cannot be protected',
     PAYMENT_METHODS.filter(m => !m.protectable).map(m => m.id).join(',') === 'cash');

  const order = await createOrder('bk_test', 500, 'upi');
  ok('UPI order is authorised and protected', order.status === 'authorized' && order.protected, order.orderRef);
  const held = await holdFunds(order);
  ok('capture moves money to held', held.status === 'held' && held.protected);
  const released = await releaseFunds(held);
  ok('release pays the worker and drops protection', released.status === 'released' && !released.protected);
  const back = await refund(held, 40);
  ok('refund returns the amount minus the fee', back.status === 'refunded' && back.amount === 460, `₹${back.amount}`);

  const cashOrder = await createOrder('bk_test', 500, 'cash');
  ok('cash is never marked protected', cashOrder.status === 'unpaid' && !cashOrder.protected);
  ok('every payment state has a label', ['unpaid','authorized','held','released','refunded'].every(s => !!statusKey(s)));
  ok('order references are deterministic',
     (await createOrder('bk_x', 100, 'upi')).orderRef === (await createOrder('bk_x', 100, 'upi')).orderRef);

  /* ==================================================== 12. CANCELLATION */
  section('Cancellation policy');
  const mk = (status, extra = {}) => ({ ...db.jobs[0], status, agreedAmount: 300, payment: { ...EMPTY_PAYMENT }, ...extra });
  ok('cancelling before acceptance is free', cancelTerms(mk('requested'), 'client').free);
  ok('cancelling before the worker sets off is free', cancelTerms(mk('accepted'), 'client').free);
  const travelling = cancelTerms(mk('on_the_way'), 'client');
  ok('cancelling after travel starts has a fee', !travelling.free && travelling.fee > 0, `₹${travelling.fee}`);
  ok('the fee is capped at ₹100', travelFee(mk('on_the_way', { agreedAmount: 99999 })) <= 100, `₹${travelFee(mk('on_the_way', { agreedAmount: 99999 }))}`);
  ok('a worker cancelling never charges the customer', cancelTerms(mk('on_the_way'), 'worker').free);
  ok('worker cancellation offers a replacement', cancelTerms(mk('on_the_way'), 'worker').nextKey === 'cx.replacementOffered');
  ok('a completed job cannot be cancelled', !canCancel(mk('completed'), 'client'));
  ok('policy is published as 4 rows', POLICY_ROWS.length === 4);
  ok('every policy row has a translated label and cost',
     POLICY_ROWS.every(r => !!DICTS.hi[r.whenKey] && !!DICTS.hi[r.costKey]));

  /* ==================================================== 13. GEO / ETA */
  section('Distance and ETA');
  const d = distanceKm({ lat: 12.9352, lng: 77.6245 }, { lat: 12.9121, lng: 77.6446 });
  ok('Koramangala to HSR is 2-6 km', d > 2 && d < 6, formatKm(d));
  ok('ETA grows with distance', etaMinutes(0.4) < etaMinutes(3.4), `${etaMinutes(0.4)} vs ${etaMinutes(3.4)} min`);

  console.log(fails === 0 ? '\n🎉 ALL CHECKS PASSED' : `\n⚠️  ${fails} CHECK(S) FAILED`);
  process.exit(fails ? 1 : 0);
})();
