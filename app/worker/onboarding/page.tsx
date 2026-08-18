'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LANGUAGES } from '@/lib/i18n';
import { AREAS, nearestArea } from '@/lib/geo';
import { categoryById, CATEGORIES } from '@/lib/ai/taxonomy';
import { extractWorkerProfile, type ExtractedProfile } from '@/lib/ai/profile';
import type { Availability, CategoryId, Geo } from '@/lib/types';
import { useActions, useStore, useT } from '@/components/store';
import { VoiceInput } from '@/components/voice';
import { PhoneOtp } from '@/components/phone';
import { Shell, Steps, TopBar } from '@/components/ui';

const TOTAL = 6;

export default function WorkerOnboarding() {
  const router = useRouter();
  const { t, lang } = useT();
  const { db } = useStore();
  const { setLang, registerWorker, loginWorker } = useActions();

  const [step, setStep] = React.useState(0);
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [speech, setSpeech] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [profile, setProfile] = React.useState<ExtractedProfile | null>(null);
  const [geo, setGeo] = React.useState<Geo>(AREAS[0]);
  const [geoNote, setGeoNote] = React.useState('');
  const [radiusKm, setRadiusKm] = React.useState(5);
  const [availability, setAvailability] = React.useState<Availability>('anytime');

  async function analyze() {
    if (!speech.trim()) return;
    setBusy(true);
    const p = await extractWorkerProfile(speech, lang);
    setProfile(p);
    setBusy(false);
    setStep(3);
  }

  function useGps() {
    if (!navigator.geolocation) { setGeoNote(t('ob.loc.denied')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeo(nearestArea(pos.coords.latitude, pos.coords.longitude)); setGeoNote(''); },
      () => setGeoNote(t('ob.loc.denied')),
      { timeout: 8000 }
    );
  }

  function finish() {
    if (!profile) return;
    registerWorker({
      name: name.trim() || 'Worker',
      phone,
      lang,
      category: profile.category,
      skills: profile.skills,
      experienceYears: profile.experienceYears,
      rawSpeech: speech,
      summary: profile.summary,
      geo,
      radiusKm,
      availability,
    });
    setStep(6);
  }

  return (
    <Shell>
      <TopBar
        title={t('app.name')}
        subtitle={`${t('c.step')} ${Math.min(step + 1, TOTAL)} ${t('c.of')} ${TOTAL}`}
        back={step > 0 ? true : '/'}
      />
      <div className="page stack-lg">
        {step < 6 ? <Steps n={step + 1} of={TOTAL} /> : null}

        {/* ---------------- 0. language ---------------- */}
        {step === 0 ? (
          <>
            <div>
              <h2 className="title">{t('ob.lang.title')}</h2>
              <p className="sub">{t('ob.lang.sub')}</p>
            </div>
            <div className="stack">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`opt${l.code === lang ? ' selected' : ''}`}
                  onClick={() => setLang(l.code)}
                >
                  <span className="emoji">🗣️</span>
                  <span>
                    <span className="t">{l.native}</span>
                    <br />
                    <span className="d">{l.label}</span>
                  </span>
                  {l.code === lang ? <span className="check">✓</span> : null}
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => setStep(1)}>{t('c.continue')}</button>
          </>
        ) : null}

        {/* ---------------- 1. phone + otp ---------------- */}
        {step === 1 ? (
          <PhoneOtp
            askName
            onVerified={(p, n) => {
              setPhone(p);
              setName(n);
              // Returning worker? Straight to the dashboard.
              const existing = db.workers.find((w) => w.phone === p);
              if (existing) {
                loginWorker(p, lang);
                router.push('/worker');
                return;
              }
              setStep(2);
            }}
          />
        ) : null}

        {/* ---------------- 2. voice profile ---------------- */}
        {step === 2 ? (
          <>
            <div>
              <h2 className="title">{t('ob.voice.title')}</h2>
              <p className="sub">{t('ob.voice.sub')}</p>
            </div>
            <VoiceInput lang={lang} value={speech} onChange={setSpeech} />
            <button className="btn" disabled={!speech.trim() || busy} onClick={analyze}>
              {busy ? '🧠 …' : `✨ ${t('ob.voice.analyze')}`}
            </button>
          </>
        ) : null}

        {/* ---------------- 3. confirm extracted profile ---------------- */}
        {step === 3 && profile ? (
          <>
            <div>
              <h2 className="title">{t('ob.review.title')}</h2>
              <p className="sub">{t('ob.review.sub')}</p>
            </div>

            <div className="card">
              <div className="kv">
                <span className="k">{t('ob.review.category')}</span>
                <span className="v">
                  {categoryById(profile.category).icon} {t(`cat.${profile.category}` as any)}
                </span>
              </div>
              <div className="kv">
                <span className="k">{t('ob.review.exp')}</span>
                <span className="v">{profile.experienceYears} {t('c.years')}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <span className="k muted">{t('ob.review.skills')}</span>
                <div className="chips" style={{ marginTop: 8 }}>
                  {profile.skills.map((s) => (
                    <span key={s} className="chip on">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <details className="card flat">
              <summary className="tiny bold" style={{ cursor: 'pointer' }}>
                ✏️ Change the type of work
              </summary>
              <div className="chips" style={{ marginTop: 12 }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className={`chip${c.id === profile.category ? ' on' : ''}`}
                    onClick={() =>
                      setProfile({
                        ...profile,
                        category: c.id as CategoryId,
                        skills: c.commonSkills.slice(0, 3),
                      })
                    }
                  >
                    {c.icon} {t(`cat.${c.id}` as any)}
                  </button>
                ))}
              </div>
            </details>

            <div className="card flat">
              <div className="tiny bold" style={{ marginBottom: 6 }}>🎙️ You said</div>
              <div className="muted" style={{ fontSize: 15 }}>&ldquo;{speech}&rdquo;</div>
            </div>

            <button className="btn" onClick={() => setStep(4)}>✓ {t('ob.review.ok')}</button>
            <button className="btn ghost" onClick={() => { setSpeech(''); setStep(2); }}>
              {t('ob.review.redo')}
            </button>
          </>
        ) : null}

        {/* ---------------- 4. location + radius ---------------- */}
        {step === 4 ? (
          <>
            <div>
              <h2 className="title">{t('ob.loc.title')}</h2>
              <p className="sub">{t('ob.loc.sub')}</p>
            </div>

            <button className="btn secondary" onClick={useGps}>📍 {t('ob.loc.gps')}</button>
            {geoNote ? <div className="banner warn">{geoNote}</div> : null}

            <div>
              <label className="lbl">{t('ob.loc.pick')}</label>
              <div className="stack">
                {AREAS.map((a) => (
                  <button
                    key={a.areaName}
                    className={`opt${a.areaName === geo.areaName ? ' selected' : ''}`}
                    onClick={() => setGeo(a)}
                  >
                    <span className="emoji">📍</span>
                    <span className="t">{a.areaName}</span>
                    {a.areaName === geo.areaName ? <span className="check">✓</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="lbl">{t('ob.loc.radius')}</label>
              <div className="grid3">
                {[2, 5, 10].map((r) => (
                  <button
                    key={r}
                    className={`chip${radiusKm === r ? ' on' : ''}`}
                    style={{ minHeight: 56, justifyContent: 'center', fontSize: 17 }}
                    onClick={() => setRadiusKm(r)}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            <button className="btn" onClick={() => setStep(5)}>{t('c.continue')}</button>
          </>
        ) : null}

        {/* ---------------- 5. availability ---------------- */}
        {step === 5 ? (
          <>
            <div>
              <h2 className="title">{t('ob.avail.title')}</h2>
            </div>
            <div className="stack">
              {([
                ['today', '☀️', t('ob.avail.today')],
                ['weekdays', '📅', t('ob.avail.weekdays')],
                ['anytime', '🕘', t('ob.avail.anytime')],
              ] as [Availability, string, string][]).map(([v, icon, label]) => (
                <button
                  key={v}
                  className={`opt${availability === v ? ' selected' : ''}`}
                  onClick={() => setAvailability(v)}
                >
                  <span className="emoji">{icon}</span>
                  <span className="t">{label}</span>
                  {availability === v ? <span className="check">✓</span> : null}
                </button>
              ))}
            </div>
            <button className="btn" onClick={finish}>✓ {t('c.confirm')}</button>
          </>
        ) : null}

        {/* ---------------- 6. done ---------------- */}
        {step === 6 ? (
          <div className="stack-lg center" style={{ paddingTop: 28 }}>
            <div style={{ fontSize: 66 }}>🎉</div>
            <h2 className="title">{t('ob.done.title')}</h2>
            <p className="sub">{t('ob.done.sub')}</p>
            <div className="card" style={{ textAlign: 'left' }}>
              <div className="kv"><span className="k">{t('ob.name.label')}</span><span className="v">{name || 'Worker'}</span></div>
              <div className="kv"><span className="k">{t('ob.review.category')}</span><span className="v">{profile ? t(`cat.${profile.category}` as any) : '-'}</span></div>
              <div className="kv"><span className="k">{t('w.profile.radius')}</span><span className="v">{radiusKm} km · {geo.areaName}</span></div>
              <div className="kv"><span className="k">{t('w.profile.availability')}</span><span className="v">{t(`ob.avail.${availability}` as any)}</span></div>
            </div>
            <button className="btn" onClick={() => router.push('/worker')}>{t('ob.done.go')}</button>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
