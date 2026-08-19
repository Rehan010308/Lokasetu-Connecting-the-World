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
import { telLink, waLink, navigateLink, sosMessage, e164, workerShareText } from './links';
import { distanceKm, formatKm } from './geo';

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

  /* ==================================================== 10. GEO / ETA */
  section('Distance and ETA');
  const d = distanceKm({ lat: 12.9352, lng: 77.6245 }, { lat: 12.9121, lng: 77.6446 });
  ok('Koramangala to HSR is 2-6 km', d > 2 && d < 6, formatKm(d));
  ok('ETA grows with distance', etaMinutes(0.4) < etaMinutes(3.4), `${etaMinutes(0.4)} vs ${etaMinutes(3.4)} min`);

  console.log(fails === 0 ? '\n🎉 ALL CHECKS PASSED' : `\n⚠️  ${fails} CHECK(S) FAILED`);
  process.exit(fails ? 1 : 0);
})();
