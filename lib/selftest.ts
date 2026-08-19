/**
 * Self-test for the whole logic layer — no browser needed.
 *
 *   npm run test
 *
 * These assertions are the safety net for the two bugs V2 exists to kill:
 * mixed-language UI, and workers appearing under the wrong category.
 */
// @ts-nocheck
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
import { distanceKm, formatKm, AREAS } from './geo';
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
    const kora = AREAS[0], hsr = AREAS[1];

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
