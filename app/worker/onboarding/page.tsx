'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LANGUAGES } from '@/lib/i18n';
import { nearestArea } from '@/lib/geo';
import { CITIES, city, geoOf } from '@/lib/cities';
import { CATEGORIES, servicesOf, service } from '@/lib/catalog';
import { categoryName, serviceName } from '@/lib/i18n-catalog';
import { extractWorkerProfile, type ExtractedProfile } from '@/lib/ai/profile';
import { UNVERIFIED } from '@/lib/verify';
import type { Availability, CategoryId, Geo, LangCode } from '@/lib/types';
import { useActions, useStore, useT } from '@/components/store';
import { CardSkeleton, GlassCard, Reveal, Ring, SPRING, Stagger, StaggerItem } from '@/components/aurora';
import { HeaderTools, PhoneOtp, Shell, TopBar, VoiceField } from '@/components/kit';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Step = 'lang' | 'phone' | 'speak' | 'confirm' | 'ask' | 'where' | 'when' | 'done';
const ORDER: Step[] = ['lang', 'phone', 'speak', 'confirm', 'ask', 'where', 'when', 'done'];

/** The AI's questions, in the worker's own language. */
const ASK: Record<Step, Record<LangCode, string>> = {
  lang: {
    en: 'Which language do you want to use?', hi: 'आप कौन सी भाषा इस्तेमाल करेंगे?',
    ta: 'எந்த மொழியை பயன்படுத்துவீர்கள்?', te: 'మీరు ఏ భాష వాడతారు?',
    kn: 'ನೀವು ಯಾವ ಭಾಷೆ ಬಳಸುತ್ತೀರಿ?', ml: 'ഏത് ഭാഷ ഉപയോഗിക്കും?',
    mr: 'तुम्ही कोणती भाषा वापराल?', bn: 'আপনি কোন ভাষা ব্যবহার করবেন?',
    gu: 'તમે કઈ ભાષા વાપરશો?', pa: 'ਤੁਸੀਂ ਕਿਹੜੀ ਭਾਸ਼ਾ ਵਰਤੋਗੇ?',
  },
  phone: {
    en: 'What is your mobile number? This keeps your account safe.',
    hi: 'आपका मोबाइल नंबर क्या है? इससे आपका खाता सुरक्षित रहता है।',
    ta: 'உங்கள் கைபேசி எண் என்ன? இது உங்கள் கணக்கை பாதுகாக்கும்.',
    te: 'మీ మొబైల్ నంబర్ ఏమిటి? ఇది మీ ఖాతాను సురక్షితంగా ఉంచుతుంది.',
    kn: 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು? ಇದು ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಸುರಕ್ಷಿತವಾಗಿಡುತ್ತದೆ.',
    ml: 'നിങ്ങളുടെ മൊബൈൽ നമ്പർ എന്താണ്? ഇത് അക്കൗണ്ട് സുരക്ഷിതമാക്കും.',
    mr: 'तुमचा मोबाइल नंबर काय आहे? यामुळे तुमचे खाते सुरक्षित राहते.',
    bn: 'আপনার মোবাইল নম্বর কী? এটি আপনার অ্যাকাউন্ট নিরাপদ রাখে।',
    gu: 'તમારો મોબાઇલ નંબર શું છે? આનાથી તમારું ખાતું સુરક્ષિત રહે છે.',
    pa: 'ਤੁਹਾਡਾ ਮੋਬਾਈਲ ਨੰਬਰ ਕੀ ਹੈ? ਇਸ ਨਾਲ ਤੁਹਾਡਾ ਖਾਤਾ ਸੁਰੱਖਿਅਤ ਰਹਿੰਦਾ ਹੈ।',
  },
  speak: {
    en: 'Now tell me what work you do. Just speak — like you would tell a friend.',
    hi: 'अब बताइए आप क्या काम करते हैं। बस बोलिए — जैसे किसी दोस्त को बताते हैं।',
    ta: 'இப்போது நீங்கள் என்ன வேலை செய்கிறீர்கள் என்று சொல்லுங்கள். நண்பரிடம் பேசுவது போல.',
    te: 'ఇప్పుడు మీరు ఏ పని చేస్తారో చెప్పండి. స్నేహితుడితో మాట్లాడినట్లు.',
    kn: 'ಈಗ ನೀವು ಏನು ಕೆಲಸ ಮಾಡುತ್ತೀರಿ ಎಂದು ಹೇಳಿ. ಸ್ನೇಹಿತನಿಗೆ ಹೇಳುವಂತೆ.',
    ml: 'ഇനി നിങ്ങൾ എന്ത് ജോലി ചെയ്യുന്നു എന്ന് പറയൂ. ഒരു സുഹൃത്തിനോട് പറയുന്നത് പോലെ.',
    mr: 'आता तुम्ही काय काम करता ते सांगा. मित्राला सांगता तसे बोला.',
    bn: 'এখন বলুন আপনি কী কাজ করেন। বন্ধুকে বলার মতো করে বলুন।',
    gu: 'હવે કહો તમે શું કામ કરો છો. મિત્રને કહો તેમ બોલો.',
    pa: 'ਹੁਣ ਦੱਸੋ ਤੁਸੀਂ ਕੀ ਕੰਮ ਕਰਦੇ ਹੋ। ਦੋਸਤ ਨੂੰ ਦੱਸਣ ਵਾਂਗ ਬੋਲੋ।',
  },
  ask: {
    en: 'A few things you did not mention. I will not guess them.',
    hi: 'कुछ बातें आपने नहीं बताईं। मैं उनका अंदाज़ा नहीं लगाऊँगा।',
    ta: 'சில விஷயங்களை நீங்கள் சொல்லவில்லை. அவற்றை நான் ஊகிக்க மாட்டேன்.',
    te: 'కొన్ని విషయాలు మీరు చెప్పలేదు. వాటిని నేను ఊహించను.',
    kn: 'ಕೆಲವು ವಿಷಯಗಳನ್ನು ನೀವು ಹೇಳಲಿಲ್ಲ. ಅವನ್ನು ನಾನು ಊಹಿಸುವುದಿಲ್ಲ.',
    ml: 'ചില കാര്യങ്ങൾ നിങ്ങൾ പറഞ്ഞില്ല. അവ ഞാൻ ഊഹിക്കില്ല.',
    mr: 'काही गोष्टी तुम्ही सांगितल्या नाहीत. त्यांचा मी अंदाज लावणार नाही.',
    bn: 'কিছু বিষয় আপনি বলেননি। সেগুলো আমি অনুমান করব না।',
    gu: 'કેટલીક વાતો તમે કહી નથી. તેનું હું અનુમાન નહીં કરું.',
    pa: 'ਕੁਝ ਗੱਲਾਂ ਤੁਸੀਂ ਨਹੀਂ ਦੱਸੀਆਂ। ਮੈਂ ਉਨ੍ਹਾਂ ਦਾ ਅੰਦਾਜ਼ਾ ਨਹੀਂ ਲਾਵਾਂਗਾ।',
  },
  confirm: {
    en: 'This is what I understood. Did I get it right?', hi: 'मैंने यह समझा। क्या यह सही है?',
    ta: 'நான் இதைப் புரிந்துகொண்டேன். சரியா?', te: 'నేను ఇది అర్థం చేసుకున్నాను. సరిగ్గా ఉందా?',
    kn: 'ನಾನು ಇದನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡೆ. ಸರಿಯೇ?', ml: 'ഞാൻ ഇത് മനസ്സിലാക്കി. ശരിയാണോ?',
    mr: 'मला हे समजले. हे बरोबर आहे का?', bn: 'আমি এটা বুঝেছি। ঠিক আছে?',
    gu: 'મને આ સમજાયું. બરાબર છે?', pa: 'ਮੈਂ ਇਹ ਸਮਝਿਆ। ਕੀ ਇਹ ਸਹੀ ਹੈ?',
  },
  where: {
    en: 'Where do you work, and how far can you travel?', hi: 'आप कहाँ काम करते हैं, और कितनी दूर जा सकते हैं?',
    ta: 'நீங்கள் எங்கே வேலை செய்கிறீர்கள், எவ்வளவு தூரம் போக முடியும்?',
    te: 'మీరు ఎక్కడ పని చేస్తారు, ఎంత దూరం వెళ్ళగలరు?',
    kn: 'ನೀವು ಎಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ, ಎಷ್ಟು ದೂರ ಹೋಗಬಲ್ಲಿರಿ?',
    ml: 'നിങ്ങൾ എവിടെ ജോലി ചെയ്യുന്നു, എത്ര ദൂരം പോകാം?',
    mr: 'तुम्ही कुठे काम करता, आणि किती लांब जाऊ शकता?',
    bn: 'আপনি কোথায় কাজ করেন, আর কত দূর যেতে পারেন?',
    gu: 'તમે ક્યાં કામ કરો છો, અને કેટલે દૂર જઈ શકો?',
    pa: 'ਤੁਸੀਂ ਕਿੱਥੇ ਕੰਮ ਕਰਦੇ ਹੋ, ਤੇ ਕਿੰਨੀ ਦੂਰ ਜਾ ਸਕਦੇ ਹੋ?',
  },
  when: {
    en: 'Last one — when can you work?', hi: 'आखिरी सवाल — आप कब काम कर सकते हैं?',
    ta: 'கடைசி கேள்வி — எப்போது வேலை செய்ய முடியும்?', te: 'చివరి ప్రశ్న — మీరు ఎప్పుడు పని చేయగలరు?',
    kn: 'ಕೊನೆಯ ಪ್ರಶ್ನೆ — ಯಾವಾಗ ಕೆಲಸ ಮಾಡಬಲ್ಲಿರಿ?', ml: 'അവസാന ചോദ്യം — എപ്പോൾ ജോലി ചെയ്യാം?',
    mr: 'शेवटचा प्रश्न — तुम्ही कधी काम करू शकता?', bn: 'শেষ প্রশ্ন — আপনি কখন কাজ করতে পারবেন?',
    gu: 'છેલ્લો સવાલ — તમે ક્યારે કામ કરી શકો?', pa: 'ਆਖਰੀ ਸਵਾਲ — ਤੁਸੀਂ ਕਦੋਂ ਕੰਮ ਕਰ ਸਕਦੇ ਹੋ?',
  },
  done: {
    en: 'Your profile is live. Nearby jobs will come to you now.',
    hi: 'आपकी प्रोफाइल चालू है। पास के काम अब आपके पास आएँगे।',
    ta: 'உங்கள் சுயவிவரம் செயலில். அருகிலுள்ள வேலைகள் இனி வரும்.',
    te: 'మీ ప్రొఫైల్ యాక్టివ్. దగ్గరలోని పనులు ఇప్పుడు వస్తాయి.',
    kn: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಸಕ್ರಿಯ. ಹತ್ತಿರದ ಕೆಲಸಗಳು ಈಗ ಬರುತ್ತವೆ.',
    ml: 'നിങ്ങളുടെ പ്രൊഫൈൽ സജീവം. അടുത്തുള്ള ജോലികൾ ഇനി വരും.',
    mr: 'तुमचे प्रोफाइल सुरू आहे. जवळची कामे आता तुमच्याकडे येतील.',
    bn: 'আপনার প্রোফাইল চালু। কাছের কাজ এখন আপনার কাছে আসবে।',
    gu: 'તમારી પ્રોફાઇલ ચાલુ છે. નજીકનાં કામ હવે તમારી પાસે આવશે.',
    pa: 'ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਚਾਲੂ ਹੈ। ਨੇੜਲੇ ਕੰਮ ਹੁਣ ਤੁਹਾਡੇ ਕੋਲ ਆਉਣਗੇ।',
  },
};

interface Turn { who: 'ai' | 'me'; text: string }

export default function Onboarding() {
  const router = useRouter();
  const { t, lang } = useT();
  const { db, ready } = useStore();
  const { setLang, registerWorker, loginWorker } = useActions();
  const reduce = useReducedMotion();

  const [step, setStep] = React.useState<Step>('lang');
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [speech, setSpeech] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [profile, setProfile] = React.useState<ExtractedProfile | null>(null);
  const [cityId, setCityId] = React.useState('blr');
  const [geo, setGeo] = React.useState<Geo>(geoOf('blr_koramangala')!);
  const [radiusKm, setRadiusKm] = React.useState(5);
  const [availability, setAvailability] = React.useState<Availability>('anytime');
  /* Answers to the questions the AI is not allowed to guess. */
  const [gapIdx, setGapIdx] = React.useState(0);
  const [years, setYears] = React.useState<number | null>(null);
  const [languages, setLanguages] = React.useState<LangCode[]>([]);
  const [fullTime, setFullTime] = React.useState<boolean | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  const idx = ORDER.indexOf(step);
  const ask = (s: Step) => ASK[s][lang];
  const say = (who: Turn['who'], text: string) => setTurns((p) => [...p, { who, text }]);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns, step]);

  async function analyse() {
    say('me', speech);
    setBusy(true);
    const p = await extractWorkerProfile(speech, lang);
    setProfile(p);
    setBusy(false);
    setStep('confirm');
    say('ai', ask('confirm'));
  }

  function finish() {
    if (!profile) return;
    registerWorker({
      name: name.trim() || 'Worker',
      phone, lang,
      languages: languages.length ? languages : [lang],
      category: profile.category,
      services: profile.services,
      /* Only ever what the worker said. `null` reaches the profile as "—". */
      experienceYears: years,
      rawSpeech: speech,        // kept in the script they actually spoke
      bio: profile.bio,
      geo, radiusKm, availability,
      verification: UNVERIFIED,
    });
    setStep('done');
    say('ai', ask('done'));
  }

  if (!ready) {
    return <Shell><main className="page" style={{ paddingTop: 100 }}><CardSkeleton /></main></Shell>;
  }

  return (
    <Shell>
      <TopBar
        back="/login"
        right={<Ring value={Math.round(((idx + 1) / ORDER.length) * 100)} size="s" label={`${idx + 1}/${ORDER.length}`} />}
      />
      <main className="page v-4" style={{ paddingTop: 2, paddingBottom: 36 }}>

        <div className="h-2"><span className="tag in">✨ AI</span><span className="tag">{t('o.workSub')}</span></div>

        <div className="v-3">
          <Bubble who="ai" text={ask('lang')} />
          {turns.map((x, i) => <Bubble key={i} who={x.who} text={x.text} />)}
          {busy ? <Bubble who="ai" text="…" /> : null}
        </div>

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
                <Stagger className="v-3" gap={0.04}>
                  {LANGUAGES.map((l) => (
                    <StaggerItem key={l.code}>
                      <button className={`choice${l.code === lang ? ' on' : ''}`} onClick={() => setLang(l.code)}>
                        <span className="lead" aria-hidden>🗣️</span>
                        <span><span className="ttl">{l.native}</span><br /><span className="sub">{l.label}</span></span>
                        {l.code === lang ? <span className="mark">✓</span> : null}
                      </button>
                    </StaggerItem>
                  ))}
                </Stagger>
                <button className="btn" onClick={() => {
                  say('me', LANGUAGES.find((l) => l.code === lang)!.native);
                  setStep('phone'); say('ai', ASK.phone[lang]);
                }}>{t('c.continue')}</button>
              </>
            ) : null}

            {step === 'phone' ? (
              <GlassCard className="pad">
                <PhoneOtp askName onVerified={(p, n) => {
                  setPhone(p); setName(n);
                  if (db.workers.find((w) => w.phone === p)) { loginWorker(p, lang); router.push('/'); return; }
                  say('me', `+91 ${p}${n ? ` · ${n}` : ''}`);
                  setStep('speak'); say('ai', ASK.speak[lang]);
                }} />
              </GlassCard>
            ) : null}

            {step === 'speak' ? (
              <>
                <VoiceField lang={lang} value={speech} onChange={setSpeech} />
                <button className="btn" disabled={!speech.trim() || busy} onClick={analyse}>✨ {t('o.create')}</button>
              </>
            ) : null}

            {step === 'confirm' && profile ? (
              <>
                <GlassCard className="pad" glow="em">
                  <p className="t-micro" style={{ marginBottom: 12 }}>{t('o.understood')}</p>
                  <div className="kv" style={{ paddingTop: 0 }}>
                    <span className="k">{t('s.pickService')}</span>
                    <span className="v">{categoryName(profile.category, lang)}</span>
                  </div>
                  {profile.experienceYears !== null ? (
                    <div className="kv">
                      <span className="k">{t('w.experience')}</span>
                      <span className="v">{profile.experienceYears} {t('c.years')}</span>
                    </div>
                  ) : null}
                  <div className="h-2 wrap" style={{ gap: 8, marginTop: 14 }}>
                    {profile.services.map((s) => (
                      <span key={s} className="chip on" style={{ minHeight: 36, fontSize: 13.5 }}>{serviceName(s, lang)}</span>
                    ))}
                  </div>
                  <p className="t-xs" style={{ marginTop: 14 }}>{profile.bio}</p>
                </GlassCard>

                <details className="glass flat pad-s">
                  <summary className="t-xs strong" style={{ cursor: 'pointer' }}>✏️ {t('o.changeWork')}</summary>
                  <div className="h-2 wrap" style={{ gap: 8, marginTop: 12 }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.id} className={`chip${c.id === profile.category ? ' on' : ''}`}
                        style={{ minHeight: 38, fontSize: 13.5 }}
                        onClick={() => setProfile({ ...profile, category: c.id as CategoryId, services: servicesOf(c.id).slice(0, 3).map((s) => s.id) })}>
                        {c.icon} {categoryName(c.id, lang)}
                      </button>
                    ))}
                  </div>
                  <div className="h-2 wrap" style={{ gap: 8, marginTop: 12 }}>
                    {servicesOf(profile.category).map((s) => {
                      const on = profile.services.includes(s.id);
                      return (
                        <button key={s.id} className={`chip${on ? ' on' : ''}`} style={{ minHeight: 36, fontSize: 13 }}
                          onClick={() => setProfile({
                            ...profile,
                            services: on ? profile.services.filter((x) => x !== s.id) : [...profile.services, s.id],
                          })}>
                          {s.icon} {serviceName(s.id, lang)}
                        </button>
                      );
                    })}
                  </div>
                </details>

                <button className="btn" disabled={!profile.services.length}
                  onClick={() => {
                    say('me', t('o.correct'));
                    setYears(profile.experienceYears);
                    setLanguages([lang]);
                    setStep('ask');
                    say('ai', ASK.ask[lang]);
                  }}>
                  ✓ {t('o.correct')}
                </button>
                <button className="btn quiet" onClick={() => { setSpeech(''); setProfile(null); setStep('speak'); }}>
                  {t('o.redo')}
                </button>
              </>
            ) : null}

            {/* ------------------------------------------------------------
                THE QUESTIONS THE AI IS NOT ALLOWED TO SKIP

                Everything here is something the transcript did NOT establish.
                The old build filled these in silently — a worker who said only
                "I am an electrician" got a profile claiming one year of
                experience, one language and full availability, none of which
                they had said. One question at a time, answers only.
               ------------------------------------------------------------ */}
            {step === 'ask' && profile ? (() => {
              const gaps = profile.missing.filter((g) => g === 'years' || g === 'services' || g === 'languages');
              const gap = gaps[gapIdx];

              const next = () => {
                if (gapIdx + 1 < gaps.length) { setGapIdx(gapIdx + 1); return; }
                setStep('where');
                say('ai', ASK.where[lang]);
              };

              if (!gap) { setStep('where'); return null; }

              return (
                <>
                  <p className="t-micro">{t('q.sub')} · {gapIdx + 1}/{gaps.length}</p>

                  {gap === 'years' ? (
                    <GlassCard className="pad v-3">
                      <h2 className="t-h3">{t('q.years')}</h2>
                      <div className="h-2 wrap" style={{ gap: 8 }}>
                        {[1, 2, 3, 5, 8, 10, 15, 20].map((n) => (
                          <button key={n} className={`chip${years === n ? ' on' : ''}`}
                            style={{ minWidth: 62, justifyContent: 'center', minHeight: 46 }}
                            onClick={() => setYears(n)}>
                            {n}{n === 20 ? '+' : ''}
                          </button>
                        ))}
                      </div>
                      <button className="btn" disabled={years === null}
                        onClick={() => { say('me', `${years} ${t('c.years')}`); next(); }}>
                        {t('c.continue')}
                      </button>
                      <button className="btn quiet" onClick={() => { setYears(null); say('me', t('q.notSure')); next(); }}>
                        {t('q.notSure')}
                      </button>
                    </GlassCard>
                  ) : null}

                  {gap === 'services' ? (
                    <GlassCard className="pad v-3">
                      <h2 className="t-h3">{t('q.services')}</h2>
                      <div className="h-2 wrap" style={{ gap: 8 }}>
                        {servicesOf(profile.category).map((sv) => {
                          const on = profile.services.includes(sv.id);
                          return (
                            <button key={sv.id} className={`chip${on ? ' on' : ''}`} style={{ minHeight: 44 }}
                              onClick={() => setProfile({
                                ...profile,
                                services: on
                                  ? profile.services.filter((x) => x !== sv.id)
                                  : [...profile.services, sv.id],
                              })}>
                              {sv.icon} {serviceName(sv.id, lang)}
                            </button>
                          );
                        })}
                      </div>
                      <button className="btn" disabled={!profile.services.length}
                        onClick={() => {
                          say('me', profile.services.map((x) => serviceName(x, lang)).join(', '));
                          next();
                        }}>
                        {t('c.continue')}
                      </button>
                    </GlassCard>
                  ) : null}

                  {gap === 'languages' ? (
                    <GlassCard className="pad v-3">
                      <h2 className="t-h3">{t('q.languages')}</h2>
                      <div className="h-2 wrap" style={{ gap: 8 }}>
                        {LANGUAGES.map((l) => {
                          const on = languages.includes(l.code);
                          return (
                            <button key={l.code} className={`chip${on ? ' on' : ''}`} style={{ minHeight: 44 }}
                              onClick={() => setLanguages(on
                                ? languages.filter((x) => x !== l.code)
                                : [...languages, l.code])}>
                              {l.native}
                            </button>
                          );
                        })}
                      </div>
                      <button className="btn" disabled={!languages.length}
                        onClick={() => {
                          say('me', languages.map((c) => LANGUAGES.find((l) => l.code === c)?.native).join(', '));
                          next();
                        }}>
                        {t('c.continue')}
                      </button>
                    </GlassCard>
                  ) : null}
                </>
              );
            })() : null}

            {step === 'where' ? (
              <>
                <button className="btn ghost" onClick={() => navigator.geolocation?.getCurrentPosition(
                  (p) => setGeo(nearestArea(p.coords.latitude, p.coords.longitude)), () => {}, { timeout: 8000 })}>
                  📍 {t('c.search')}
                </button>
                {/* City first, then the area inside it. The old list was six
                    Bengaluru localities, which quietly made this a Bengaluru
                    product. */}
                <div>
                  <p className="label">{t('c.pickCity')}</p>
                  <div className="h-2 wrap" style={{ gap: 8 }}>
                    {CITIES.map((c) => (
                      <button key={c.id} className={`chip${cityId === c.id ? ' on' : ''}`}
                        style={{ minHeight: 46 }}
                        onClick={() => {
                          setCityId(c.id);
                          setGeo(geoOf(c.localities[0].id)!);
                        }}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label">{t('c.pickArea')}</p>
                  <Stagger className="v-3 grid-cards" gap={0.03}>
                    {(city(cityId)?.localities ?? []).map((l) => (
                      <StaggerItem key={l.id}>
                        <button className={`choice${geo.localityId === l.id ? ' on' : ''}`} style={{ minHeight: 56 }}
                          onClick={() => setGeo(geoOf(l.id)!)}>
                          <span className="lead" aria-hidden>📍</span>
                          <span className="ttl">{l.name}</span>
                          {geo.localityId === l.id ? <span className="mark">✓</span> : null}
                        </button>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
                <div>
                  <p className="label">{t('o.radius')}</p>
                  <div className="grid-2">
                    {[2, 5, 10, 15].map((r) => (
                      <button key={r} className={`chip${radiusKm === r ? ' on' : ''}`}
                        style={{ minHeight: 54, justifyContent: 'center', fontSize: 16 }} onClick={() => setRadiusKm(r)}>
                        {r} {t('c.km')}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn" onClick={() => {
                  say('me', `${geo.areaName} · ${radiusKm} ${t('c.km')}`);
                  setStep('when'); say('ai', ASK.when[lang]);
                }}>{t('c.continue')}</button>
              </>
            ) : null}

            {step === 'when' ? (
              <>
                <Stagger className="v-3" gap={0.04}>
                  {([['today', '☀️'], ['weekdays', '📅'], ['anytime', '🕘']] as [Availability, string][]).map(([v, ic]) => (
                    <StaggerItem key={v}>
                      <button className={`choice${availability === v ? ' on' : ''}`} onClick={() => setAvailability(v)}>
                        <span className="lead" aria-hidden>{ic}</span>
                        <span className="ttl">{t(`av.${v}` as any)}</span>
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
                  <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING.bouncy} style={{ fontSize: 50 }}>🎉</motion.div>
                  <h2 className="t-h1">{t('o.done')}</h2>
                  <p className="t-sm">{t('o.doneSub')}</p>
                  <button className="btn" onClick={() => router.push('/verify')}>🪪 {t('v.now')}</button>
                  <button className="btn quiet" onClick={() => router.push('/')}>{t('o.goJobs')} →</button>
                </GlassCard>
              </Reveal>
            ) : null}
          </motion.section>
        </AnimatePresence>

        <div ref={endRef} />
      </main>
    </Shell>
  );
}

function Bubble({ who, text }: { who: 'ai' | 'me'; text: string }) {
  const reduce = useReducedMotion();
  const mine = who === 'me';
  return (
    <motion.div
      className="h top"
      style={{ gap: 11, flexDirection: mine ? 'row-reverse' : 'row' }}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.soft}
    >
      <div className={`av s${mine ? '' : ' in'}`} aria-hidden style={{ fontSize: 15 }}>{mine ? '🙋' : '✨'}</div>
      <div
        className={mine ? 'pad-s' : 'glass pad-s'}
        style={mine
          ? { borderRadius: 'var(--r-lg)', borderTopRightRadius: 8, maxWidth: '84%', background: 'var(--g-brand)', boxShadow: 'var(--glow-em)' }
          : { borderTopLeftRadius: 8, maxWidth: '84%' }}
      >
        <p className="t-sm" style={{ color: mine ? '#fff' : 'var(--ink)', fontWeight: 600 }}>{text}</p>
      </div>
    </motion.div>
  );
}
