/**
 * Self-test for the whole logic layer (no browser needed).
 *
 *   npm run test
 *
 * Every AI stub in lib/ai is exercised here. When you replace a stub with a
 * real Claude call in phase 2, keep these assertions green and the UI cannot
 * break.
 */
// @ts-nocheck
import { seedDB } from './seed';
import * as ai from './ai';
import { t } from './i18n';
import { distanceKm, formatKm } from './geo';
import { tierOf, nextTier, tierProgress, tierGap, leaderboard, etaMinutes, streakDays, endorsementsFor } from './tiers';
import { buildActivity } from './activity';

(async () => {
  const db = seedDB();
  let fails = 0;
  const ok = (label, cond, extra='') => { console.log(`${cond ? '✅' : '❌'} ${label} ${extra}`); if(!cond) fails++; };

  // 1. voice -> profile, in 3 languages
  const p1 = await ai.extractWorkerProfile('I do electrical wiring, fan installation and inverter repairs and have six years of experience');
  ok('EN voice->profile category=electrician', p1.category === 'electrician', `(${p1.category}, ${p1.experienceYears}y, [${p1.skills}])`);
  ok('EN experience = 6', p1.experienceYears === 6);

  const p2 = await ai.extractWorkerProfile('मैं बिजली की वायरिंग, पंखा लगाना और इन्वर्टर ठीक करता हूँ, 8 साल का अनुभव है', 'hi');
  ok('HI voice->profile', p2.category === 'electrician' && p2.experienceYears === 8, `(${p2.category}, ${p2.experienceYears}y)`);

  const p3 = await ai.extractWorkerProfile('நான் குழாய் கசிவு பழுது பார்க்கிறேன், 5 ஆண்டு அனுபவம்', 'ta');
  ok('TA voice->profile plumber', p3.category === 'plumber', `(${p3.category}, ${p3.experienceYears}y)`);

  const p4 = await ai.extractWorkerProfile('मैं घर की सफाई, बर्तन और झाड़ू पोछा करती हूँ', 'hi');
  ok('HI maid detected', p4.category === 'maid', `(${p4.category})`);

  // 2. resident request -> parsed job
  const j1 = await ai.parseJobRequest('Need an electrician urgently to install a ceiling fan');
  ok('EN job parse', j1.category === 'electrician' && j1.urgency === 'emergency', `(${j1.category}/${j1.urgency}/${j1.estimatedHours}h)`);

  const j2 = await ai.parseJobRequest('नल से पानी लीक हो रहा है, आज ही चाहिए', 'hi');
  ok('HI job parse plumber/today', j2.category === 'plumber' && j2.urgency === 'today', `(${j2.category}/${j2.urgency})`);

  const j3 = await ai.parseJobRequest('ಪೂರ್ತಿ ಮನೆಗೆ ಬಣ್ಣ ಹಚ್ಚಬೇಕು', 'kn');
  ok('KN job parse painter', j3.category === 'painter', `(${j3.category}/${j3.estimatedHours}h)`);

  // 3. pricing
  const pr = await ai.suggestPrice('electrician', 'emergency', 1);
  ok('pricing range sane', pr.min > 0 && pr.max > pr.min, `₹${pr.min}-₹${pr.max} :: ${pr.basis}`);
  const pr2 = await ai.suggestPrice('painter', 'flexible', 6);
  ok('painter 6h > electrician 1h', pr2.min > pr.min, `₹${pr2.min}-₹${pr2.max}`);

  // 4. matching
  const job = db.jobs[0]; // electrician job in Koramangala
  const ranked = ai.rankWorkers(job, db.workers);
  ok('matching returns results', ranked.length > 0, `top=${ranked[0].worker.name} ${ranked[0].score} (${formatKm(ranked[0].km)})`);
  ok('top match is an electrician', ranked[0].worker.category === 'electrician');
  ok('ranked desc', ranked.every((r,i)=> i===0 || ranked[i-1].score >= r.score));
  ok('respects radius', ranked.every(r => r.km <= r.worker.radiusKm));
  console.log('   top 4:', ranked.slice(0,4).map(r=>`${r.worker.name}:${r.score}@${formatKm(r.km)}`).join(', '));
  console.log('   reasons:', ranked[0].reasons.join(' · '));

  const plumbJob = db.jobs[1];
  const r2 = ai.rankWorkers(plumbJob, db.workers);
  ok('plumbing job -> plumber on top', r2[0].worker.category === 'plumber', `(${r2[0].worker.name})`);

  // 5. translation
  const tr = await ai.translateText('मैं अभी आ सकता हूँ', 'hi', 'en');
  ok('HI->EN translate', tr.translated && tr.text === 'I can come now', `-> "${tr.text}"`);
  const tr2 = await ai.translateText('I will come in 30 minutes', 'en', 'ta');
  ok('EN->TA translate', tr2.translated, `-> "${tr2.text}"`);
  const tr3 = await ai.translateText('random unknown sentence', 'en', 'hi');
  ok('unknown phrase falls back honestly', tr3.translated === false && tr3.text === 'random unknown sentence');
  ok('quickPhrases in KN', ai.quickPhrases('kn').length === 24, `(${ai.quickPhrases('kn')[0]})`);

  // 6. trust
  const trust = ai.computeTrust([
    {punctual:true, satisfactory:true, hireAgain:true},
    {punctual:false, satisfactory:true, hireAgain:true},
  ]);
  ok('trust computes 3 dimensions', trust.reliability === 3 && trust.skillQuality === 5 && trust.reviewCount === 2,
     JSON.stringify(trust));
  ok('new worker trust = 0', ai.computeTrust([]).reviewCount === 0);

  // 7. scrap
  const s = await ai.identifyScrap({ name: 'old_newspaper_pile.jpg', size: 1024*640 });
  ok('scrap detects newspaper', s.items.some(i => i.material === 'Newspaper'), JSON.stringify(s.items));
  ok('scrap value > 0', s.totalValue > 0, `₹${s.totalValue}`);
  const s2 = await ai.identifyScrap({ name: 'IMG_2231.jpg', size: 1024*640 });
  const s3 = await ai.identifyScrap({ name: 'IMG_2231.jpg', size: 1024*640 });
  ok('scrap deterministic', JSON.stringify(s2) === JSON.stringify(s3));

  // 8. i18n coverage
  const keys = ['c.continue','ob.voice.title','w.jobs.quote','r.review.post','rate.title','cat.plumber','st.open','u.emergency','pay.markPaid','ins.title'];
  for (const lang of ['en','hi','ta','te','ml','kn']) {
    const missing = keys.filter(k => t(lang,k) === t('en',k) && lang !== 'en');
    ok(`i18n ${lang} translated`, missing.length === 0, missing.length ? `missing: ${missing}` : `e.g. "${t(lang,'w.jobs.quote')}"`);
  }

  // 9. geo
  ok('distance Koramangala->HSR ~ 3-6km', (()=>{const d=distanceKm({lat:12.9352,lng:77.6245},{lat:12.9121,lng:77.6446}); return d>2 && d<6;})(),
     formatKm(distanceKm({lat:12.9352,lng:77.6245},{lat:12.9121,lng:77.6446})));

  // 10. trust tiers, streaks, endorsements, leaderboard
  const ram = db.workers.find(w => w.id === 'w1');
  const hero = db.workers.find(w => w.id === 'w9');
  ok('47 jobs @4.8 -> Gold', tierOf(ram).id === 'gold', tierOf(ram).label);
  ok('brand new worker -> Bronze', tierOf({ jobsDone: 0, trust: { overall: 0, reviewCount: 0 } }).id === 'bronze');
  ok('210 jobs @4.9 -> Community hero', tierOf(hero).id === 'hero');
  ok('top tier has no next rung', nextTier(hero) === null);
  ok('tier progress within 0-100', tierProgress(ram) >= 0 && tierProgress(ram) <= 100, tierProgress(ram) + '%');
  ok('tier gap is human readable', typeof tierGap(ram) === 'string', tierGap(ram));
  ok('endorsements earned', endorsementsFor(ram).length > 0, endorsementsFor(ram).map(e => e.label).join(', '));

  const lb = leaderboard(db.workers);
  ok('leaderboard ranks descending', lb[0].rank === 1 && lb.every((r, i) => i === 0 || lb[i - 1].points >= r.points),
     `top=${lb[0].worker.name} ${lb[0].points}pts`);
  ok('leaderboard filters by area', leaderboard(db.workers, 'HSR Layout, Bengaluru').every(r => r.worker.geo.areaName.includes('HSR')));

  const DAY = 86400000, T = 1700000000000;
  ok('streak counts consecutive days', streakDays([T, T - DAY, T - 2 * DAY]) === 3);
  ok('streak breaks on a gap', streakDays([T, T - 3 * DAY]) === 1);
  ok('eta grows with distance', etaMinutes(0.4) < etaMinutes(3.4), `${etaMinutes(0.4)}min vs ${etaMinutes(3.4)}min`);

  const act = buildActivity(db, 10);
  ok('activity feed builds', act.length === 10 && act[0].line.length > 0, `"${act[0].line}"`);
  ok('activity feed is deterministic', JSON.stringify(buildActivity(db, 10)) === JSON.stringify(buildActivity(db, 10)));
  ok('no broken articles in feed copy', act.every(a => !/\ba (?:e|a|i|o|u)/i.test(a.line)));

  console.log(fails === 0 ? '\n🎉 ALL CHECKS PASSED' : `\n⚠️  ${fails} CHECK(S) FAILED`);
  process.exit(fails ? 1 : 0);
})();
