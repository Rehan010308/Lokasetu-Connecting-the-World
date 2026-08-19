'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LANGUAGES, speechLocale } from '@/lib/i18n';
import { AREAS, nearestArea } from '@/lib/geo';
import { CATEGORIES, categoryById } from '@/lib/ai/taxonomy';
import { extractWorkerProfile, type ExtractedProfile } from '@/lib/ai/profile';
import { TIERS } from '@/lib/tiers';
import type { Availability, CategoryId, Geo, LangCode } from '@/lib/types';
import { useActions, useStore, useT } from '@/components/store';
import { PhoneOtp } from '@/components/phone';
import {
  AudioBars, GlassCard, Reveal, Ring, SPRING, Stagger, StaggerItem, TierBadge, VoiceOrb,
} from '@/components/aurora';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Step = 'lang' | 'phone' | 'speak' | 'confirm' | 'place' | 'when' | 'done';
const ORDER: Step[] = ['lang', 'phone', 'speak', 'confirm', 'place', 'when', 'done'];

/** The AI's side of the conversation, in the worker's own language. */
const ASK: Record<Step, Partial<Record<LangCode, string>> & { en: string }> = {
  lang:    { en: 'Which language do you want to talk in?', hi: 'आप किस भाषा में बात करना चाहेंगे?', ta: 'எந்த மொழியில் பேச விரும்புகிறீர்கள்?', te: 'మీరు ఏ భాషలో మాట్లాడాలనుకుంటున్నారు?', ml: 'ഏത് ഭാഷയിൽ സംസാരിക്കണം?', kn: 'ಯಾವ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಬೇಕು?' },
  phone:   { en: 'What is your mobile number? This keeps your account safe.', hi: 'आपका मोबाइल नंबर क्या है? इससे आपका खाता सुरक्षित रहता है।', ta: 'உங்கள் கைபேசி எண் என்ன? இது உங்கள் கணக்கை பாதுகாக்கும்.', te: 'మీ మొబైల్ నంబర్ ఏమిటి? ఇది మీ ఖాతాను సురక్షితంగా ఉంచుతుంది.', ml: 'നിങ്ങളുടെ മൊബൈൽ നമ്പർ എന്താണ്? ഇത് അക്കൗണ്ട് സുരക്ഷിതമാക്കും.', kn: 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು? ಇದು ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಸುರಕ್ಷಿತವಾಗಿಡುತ್ತದೆ.' },
  speak:   { en: 'Now tell me what work you do. Just speak — like you would tell a friend.', hi: 'अब बताइए आप क्या काम करते हैं। बस बोलिए — जैसे किसी दोस्त को बताते हैं।', ta: 'இப்போது நீங்கள் என்ன வேலை செய்கிறீர்கள் என்று சொல்லுங்கள். நண்பரிடம் பேசுவது போல் பேசுங்கள்.', te: 'ఇప్పుడు మీరు ఏ పని చేస్తారో చెప్పండి. స్నేహితుడితో మాట్లాడినట్లు మాట్లాడండి.', ml: 'ഇനി നിങ്ങൾ എന്ത് ജോലി ചെയ്യുന്നു എന്ന് പറയൂ. ഒരു സുഹൃത്തിനോട് പറയുന്നത് പോലെ.', kn: 'ಈಗ ನೀವು ಏನು ಕೆಲಸ ಮಾಡುತ್ತೀರಿ ಎಂದು ಹೇಳಿ. ಸ್ನೇಹಿತನಿಗೆ ಹೇಳುವಂತೆ ಮಾತನಾಡಿ.' },
  confirm: { en: 'This is what I understood. Did I get it right?', hi: 'मैंने यह समझा। क्या यह सही है?', ta: 'நான் இதைப் புரிந்துகொண்டேன். சரியா?', te: 'నేను ఇది అర్థం చేసుకున్నాను. సరిగ్గా ఉందా?', ml: 'ഞാൻ ഇത് മനസ്സിലാക്കി. ശരിയാണോ?', kn: 'ನಾನು ಇದನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡೆ. ಸರಿಯೇ?' },
  place:   { en: 'Where do you work, and how far can you travel?', hi: 'आप कहाँ काम करते हैं, और कितनी दूर जा सकते हैं?', ta: 'நீங்கள் எங்கே வேலை செய்கிறீர்கள், எவ்வளவு தூரம் போக முடியும்?', te: 'మీరు ఎక్కడ పని చేస్తారు, ఎంత దూరం వెళ్ళగలరు?', ml: 'നിങ്ങൾ എവിടെ ജോലി ചെയ്യുന്നു, എത്ര ദൂരം പോകാം?', kn: 'ನೀವು ಎಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ, ಎಷ್ಟು ದೂರ ಹೋಗಬಲ್ಲಿರಿ?' },
  when:    { en: 'Last one — when can you work?', hi: 'आखिरी सवाल — आप कब काम कर सकते हैं?', ta: 'கடைசி கேள்வி — எப்போது வேலை செய்ய முடியும்?', te: 'చివరి ప్రశ్న — మీరు ఎప్పుడు పని చేయగలరు?', ml: 'അവസാന ചോദ്യം — എപ്പോൾ ജോലി ചെയ്യാം?', kn: 'ಕೊನೆಯ ಪ್ರಶ್ನೆ — ಯಾವಾಗ ಕೆಲಸ ಮಾಡಬಲ್ಲಿರಿ?' },
  done:    { en: 'Your profile is live. Nearby jobs will come to you now.', hi: 'आपकी प्रोफाइल चालू है। पास के काम अब आपके पास आएँगे।', ta: 'உங்கள் சுயவிவரம் செயலில். அருகிலுள்ள வேலைகள் இனி உங்களை வந்தடையும்.', te: 'మీ ప్రొఫైల్ యాక్టివ్. దగ్గరలోని పనులు ఇప్పుడు మీ దగ్గరకు వస్తాయి.', ml: 'നിങ്ങളുടെ പ്രൊഫൈൽ സജീവം. അടുത്തുള്ള ജോലികൾ ഇനി വരും.', kn: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಸಕ್ರಿಯ. ಹತ್ತಿರದ ಕೆಲಸಗಳು ಈಗ ಬರುತ್ತವೆ.' },
};

interface Turn { who: 'ai' | 'me'; text: string; sub?: string }

export default function Onboarding() {
  const router = useRouter();
  const { t, lang } = useT();
  const { db } = useStore();
  const { setLang, registerWorker, loginWorker } = useActions();
  const reduce = useReducedMotion();

  const [step, setStep] = React.useState<Step>('lang');
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [speech, setSpeech] = React.useState('');
  const [listening, setListening] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [profile, setProfile] = React.useState<ExtractedProfile | null>(null);
  const [geo, setGeo] = React.useState<Geo>(AREAS[0]);
  const [radiusKm, setRadiusKm] = React.useState(5);
  const [availability, setAvailability] = React.useState<Availability>('anytime');

  const recRef = React.useRef<any>(null);
  const baseRef = React.useRef('');
  const endRef = React.useRef<HTMLDivElement>(null);
  const idx = ORDER.indexOf(step);
  const ask = (s: Step) => ASK[s][lang] ?? ASK[s].en;

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns, step, profile]);
  React.useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  function say(who: Turn['who'], text: string, sub?: string) {
    setTurns((p) => [...p, { who, text, sub }]);
  }

  /* ---------------------------------------------------------- voice capture */
  function toggleMic() {
    if (listening) { try { recRef.current?.stop(); } catch {} setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setListening(false); return; }
    const rec = new SR();
    rec.lang = speechLocale(lang);
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = speech ? speech + ' ' : '';
    rec.onresult = (e: any) => {
      let txt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setSpeech((baseRef.current + txt).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); recRef.current = rec; setListening(true); } catch { setListening(false); }
  }

  async function analyse() {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
    say('me', speech);
    setThinking(true);
    const p = await extractWorkerProfile(speech, lang);
    setProfile(p);
    setThinking(false);
    setStep('confirm');
    say('ai', ask('confirm'));
  }

  function finish() {
    if (!profile) return;
    registerWorker({
      name: name.trim() || 'Worker',
      phone, lang,
      category: profile.category,
      skills: profile.skills,
      experienceYears: profile.experienceYears,
      rawSpeech: speech,
      summary: profile.summary,
      geo, radiusKm, availability,
    });
    setStep('done');
    say('ai', ask('done'));
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => router.push('/')} aria-label={t('c.back')}>←</button>
        <div className="grow h-2">
          <span className="tag in">✨ AI onboarding</span>
          <span className="tag">no forms</span>
        </div>
        <Ring value={Math.round(((idx + 1) / ORDER.length) * 100)} size="s" label={`Step ${idx + 1} of ${ORDER.length}`} />
      </header>

      <main className="page v-4" style={{ paddingTop: 2, paddingBottom: 32 }}>

        {/* --------------------------------------------- conversation thread */}
        <div className="v-3">
          <Bubble who="ai" text={ask('lang')} />
          {turns.map((t2, i) => <Bubble key={i} who={t2.who} text={t2.text} sub={t2.sub} />)}
          {thinking ? <Thinking /> : null}
        </div>

        {/* --------------------------------------------- active control */}
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={SPRING.soft}
            className="v-4"
          >
            {step === 'lang' ? (
              <>
                <Stagger className="v-3">
                  {LANGUAGES.map((l) => (
                    <StaggerItem key={l.code}>
                      <button
                        className={`choice${l.code === lang ? ' on' : ''}`}
                        onClick={() => setLang(l.code)}
                      >
                        <span className="lead" aria-hidden>🗣️</span>
                        <span>
                          <span className="ttl">{l.native}</span><br />
                          <span className="sub">{l.label}</span>
                        </span>
                        {l.code === lang ? <span className="mark">✓</span> : null}
                      </button>
                    </StaggerItem>
                  ))}
                </Stagger>
                <button
                  className="btn"
                  onClick={() => {
                    say('me', LANGUAGES.find((l) => l.code === lang)!.native);
                    setStep('phone');
                    say('ai', ASK.phone[lang] ?? ASK.phone.en);
                  }}
                >
                  {t('c.continue')}
                </button>
              </>
            ) : null}

            {step === 'phone' ? (
              <GlassCard className="pad">
                <PhoneOtp
                  askName
                  onVerified={(p, n) => {
                    setPhone(p); setName(n);
                    const existing = db.workers.find((w) => w.phone === p);
                    if (existing) { loginWorker(p, lang); router.push('/worker'); return; }
                    say('me', `+91 ${p}${n ? ` · ${n}` : ''}`);
                    setStep('speak');
                    say('ai', ASK.speak[lang] ?? ASK.speak.en);
                  }}
                />
              </GlassCard>
            ) : null}

            {step === 'speak' ? (
              <>
                <VoiceOrb live={listening} onClick={toggleMic} />
                <div className="mid v-2" style={{ marginTop: -14 }}>
                  {listening ? <div className="h-2" style={{ justifyContent: 'center' }}><AudioBars /></div> : null}
                  <p className="t-h3">{listening ? t('ob.voice.listening') : t('ob.voice.tap')}</p>
                  <p className="t-xs">{listening ? 'बोलते रहिए, कोई जल्दी नहीं' : t('ob.voice.example')}</p>
                </div>
                <textarea
                  className="textarea"
                  value={speech}
                  onChange={(e) => setSpeech(e.target.value)}
                  placeholder={t('ob.voice.example')}
                  aria-label={t('ob.voice.title')}
                  style={{ minHeight: 96 }}
                />
                <button className="btn" disabled={!speech.trim() || thinking} onClick={analyse}>
                  ✨ {t('ob.voice.analyze')}
                </button>
              </>
            ) : null}

            {step === 'confirm' && profile ? (
              <>
                <GlassCard className="pad" glow="em">
                  <div className="between" style={{ marginBottom: 12 }}>
                    <div className="h-2"><span className="live-dot" /><p className="t-micro">What I understood</p></div>
                    <Ring value={Math.round(profile.confidence * 100)} size="s" tone="cy" label="confidence" />
                  </div>
                  <div className="kv" style={{ paddingTop: 0 }}>
                    <span className="k">{t('ob.review.category')}</span>
                    <span className="v">{categoryById(profile.category).icon} {t(`cat.${profile.category}` as any)}</span>
                  </div>
                  <div className="kv">
                    <span className="k">{t('ob.review.exp')}</span>
                    <span className="v">{profile.experienceYears} {t('c.years')}</span>
                  </div>
                  <Stagger className="h-2 wrap" style={{ marginTop: 14, gap: 8 }}>
                    {profile.skills.map((s) => (
                      <StaggerItem key={s}><span className="chip on static" style={{ minHeight: 36, fontSize: 13.5 }}>{s}</span></StaggerItem>
                    ))}
                  </Stagger>
                </GlassCard>

                <details className="glass flat pad-s">
                  <summary className="t-xs strong" style={{ cursor: 'pointer' }}>✏️ Not right? Change the trade</summary>
                  <div className="h-2 wrap" style={{ marginTop: 12, gap: 8 }}>
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        className={`chip${c.id === profile.category ? ' on' : ''}`}
                        style={{ minHeight: 38, fontSize: 13.5 }}
                        onClick={() => setProfile({ ...profile, category: c.id as CategoryId, skills: c.commonSkills.slice(0, 3) })}
                      >
                        {c.icon} {t(`cat.${c.id}` as any)}
                      </button>
                    ))}
                  </div>
                </details>

                <button className="btn" onClick={() => { say('me', t('ob.review.ok')); setStep('place'); say('ai', ASK.place[lang] ?? ASK.place.en); }}>
                  ✓ {t('ob.review.ok')}
                </button>
                <button className="btn quiet" onClick={() => { setSpeech(''); setProfile(null); setStep('speak'); }}>
                  {t('ob.review.redo')}
                </button>
              </>
            ) : null}

            {step === 'place' ? (
              <>
                <button
                  className="btn ghost"
                  onClick={() => navigator.geolocation?.getCurrentPosition(
                    (pos) => setGeo(nearestArea(pos.coords.latitude, pos.coords.longitude)),
                    () => {}, { timeout: 8000 }
                  )}
                >
                  📍 {t('ob.loc.gps')}
                </button>
                <Stagger className="v-3">
                  {AREAS.map((a) => (
                    <StaggerItem key={a.areaName}>
                      <button className={`choice${a.areaName === geo.areaName ? ' on' : ''}`} onClick={() => setGeo(a)} style={{ minHeight: 60 }}>
                        <span className="lead" aria-hidden>📍</span>
                        <span className="ttl">{a.areaName}</span>
                        {a.areaName === geo.areaName ? <span className="mark">✓</span> : null}
                      </button>
                    </StaggerItem>
                  ))}
                </Stagger>
                <div>
                  <p className="label">{t('ob.loc.radius')}</p>
                  <div className="grid-3">
                    {[2, 5, 10].map((r) => (
                      <button key={r} className={`chip${radiusKm === r ? ' on' : ''}`} style={{ minHeight: 54, justifyContent: 'center', fontSize: 16 }} onClick={() => setRadiusKm(r)}>
                        {r} km
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn" onClick={() => { say('me', `${geo.areaName} · ${radiusKm} km`); setStep('when'); say('ai', ASK.when[lang] ?? ASK.when.en); }}>
                  {t('c.continue')}
                </button>
              </>
            ) : null}

            {step === 'when' ? (
              <>
                <Stagger className="v-3">
                  {([['today', '☀️'], ['weekdays', '📅'], ['anytime', '🕘']] as [Availability, string][]).map(([v, ic]) => (
                    <StaggerItem key={v}>
                      <button className={`choice${availability === v ? ' on' : ''}`} onClick={() => setAvailability(v)}>
                        <span className="lead" aria-hidden>{ic}</span>
                        <span className="ttl">{t(`ob.avail.${v}` as any)}</span>
                        {availability === v ? <span className="mark">✓</span> : null}
                      </button>
                    </StaggerItem>
                  ))}
                </Stagger>
                <button className="btn" onClick={finish}>✓ {t('c.confirm')}</button>
              </>
            ) : null}

            {step === 'done' ? (
              <Reveal>
                <GlassCard className="pad-l mid v-4" glow="em">
                  <motion.div
                    initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING.bouncy}
                    style={{ fontSize: 54 }}
                  >
                    🎉
                  </motion.div>
                  <h2 className="t-h1">{t('ob.done.title')}</h2>
                  <div className="h-2" style={{ justifyContent: 'center' }}><TierBadge tier={TIERS[0]} /></div>
                  <p className="t-sm">{t('ob.done.sub')}</p>
                  <button className="btn" onClick={() => router.push('/worker')}>{t('ob.done.go')} →</button>
                </GlassCard>
              </Reveal>
            ) : null}
          </motion.section>
        </AnimatePresence>

        <div ref={endRef} />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ bubbles */

function Bubble({ who, text, sub }: { who: 'ai' | 'me'; text: string; sub?: string }) {
  const reduce = useReducedMotion();
  const mine = who === 'me';
  return (
    <motion.div
      className="h top"
      style={{ gap: 11, flexDirection: mine ? 'row-reverse' : 'row' }}
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING.soft}
    >
      <div className={`av s${mine ? '' : ' in'}`} aria-hidden style={{ fontSize: mine ? 14 : 16 }}>
        {mine ? 'आप' : '✨'}
      </div>
      <div
        className={mine ? 'pad-s' : 'glass pad-s'}
        style={mine
          ? { borderRadius: 'var(--r-lg)', borderTopRightRadius: 8, maxWidth: '84%', background: 'var(--g-brand)', boxShadow: 'var(--glow-em)' }
          : { borderTopLeftRadius: 8, maxWidth: '84%' }}
      >
        <p className="t-sm" style={{ color: mine ? '#fff' : 'var(--ink)', fontWeight: 600 }}>{text}</p>
        {sub ? <p className="t-xs" style={{ marginTop: 6 }}>{sub}</p> : null}
      </div>
    </motion.div>
  );
}

function Thinking() {
  return (
    <div className="h top" style={{ gap: 11 }}>
      <div className="av s in" aria-hidden style={{ fontSize: 16 }}>✨</div>
      <div className="glass pad-s" style={{ borderTopLeftRadius: 8 }}>
        <div className="bars" style={{ height: 16 }}><i /><i /><i /></div>
      </div>
    </div>
  );
}
