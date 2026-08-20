'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES, servicesOf, service, matchServices, type CategoryId } from '@/lib/catalog';
import { categoryName, serviceName } from '@/lib/i18n-catalog';
import { parseRequest } from '@/lib/ai/request';
import { suggestPrice } from '@/lib/ai/pricing';
import { rankWorkers, etaMinutes } from '@/lib/ai/match';
import { nearestArea, formatDistance } from '@/lib/geo';
import { CITIES, city, geoOf } from '@/lib/cities';
import { TRUST_POINTS } from '@/lib/payments';
import type { DurationEstimate, Geo, TimePreference } from '@/lib/types';
import { useActions, useMe, useStore, useT } from '@/components/store';
import { CardSkeleton, GlassCard, Reveal, Ring, SPRING, Stagger, StaggerItem } from '@/components/aurora';
import { Empty, HeaderTools, Initials, Money, Shell, Stars, TopBar, VerifiedBadge, VoiceField } from '@/components/kit';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/* ===========================================================================
   REQUEST BOOKING

   The old flow let a customer press "Hire" on a stranger before that stranger
   knew what the job was. This flow collects the scope first — service, problem,
   photos, time, address, duration — and only THEN shows workers, who accept or
   decline with full information.

   Seven steps, one question per screen, every one skippable-forward except the
   two that genuinely cannot be guessed: what the job is, and where it is.
   =========================================================================== */

const STEPS = ['service', 'describe', 'photos', 'time', 'address', 'duration', 'workers'] as const;
type Step = typeof STEPS[number];

const DURATIONS: { id: DurationEstimate; key: 'b.min30' | 'b.hr1' | 'b.hr2' | 'b.halfday' | 'b.fullday'; hours: number }[] = [
  { id: 'min30',   key: 'b.min30',   hours: 0.5 },
  { id: 'hr1',     key: 'b.hr1',     hours: 1 },
  { id: 'hr2',     key: 'b.hr2',     hours: 2 },
  { id: 'halfday', key: 'b.halfday', hours: 4 },
  { id: 'fullday', key: 'b.fullday', hours: 8 },
];

function durationFromHours(h: number): DurationEstimate {
  if (h <= 0.75) return 'min30';
  if (h <= 1.5) return 'hr1';
  if (h <= 3) return 'hr2';
  if (h <= 5) return 'halfday';
  return 'fullday';
}

export default function BookPage() {
  return (
    <Suspense fallback={<Shell><div className="page" style={{ paddingTop: 90 }}><CardSkeleton /></div></Shell>}>
      <Book />
    </Suspense>
  );
}

function Book() {
  const router = useRouter();
  const params = useSearchParams();
  const { db, ready } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const { requestBooking } = useActions();
  const reduce = useReducedMotion();

  const preferredWorker = params.get('worker') ?? undefined;

  const [step, setStep] = React.useState<Step>(params.get('svc') || params.get('q') ? 'describe' : 'service');
  const [cat, setCat] = React.useState<CategoryId | null>((params.get('cat') as CategoryId) ?? null);
  const [svc, setSvc] = React.useState<string | null>(params.get('svc'));
  const [description, setDescription] = React.useState(params.get('q') ?? '');
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [timePref, setTimePref] = React.useState<TimePreference>('asap');
  const [scheduled, setScheduled] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [geo, setGeo] = React.useState<Geo | null>(null);
  const [duration, setDuration] = React.useState<DurationEstimate>('hr1');
  const [price, setPrice] = React.useState<{ min: number; max: number; basis: string } | null>(null);
  const [thinking, setThinking] = React.useState(false);
  /**
   * BUG: describing the problem could bounce the user back to "Describe".
   *
   * afterDescribe() sends people to the service picker when the AI cannot work
   * out the trade — correct, it must not guess. But the picker's Continue went
   * to STEPS[idx + 1], which IS 'describe'. So the user described the job,
   * picked a trade, and was asked to describe it again. The text was still
   * there, but being re-asked reads as data loss.
   *
   * This remembers that we detoured, so picking a trade resumes forward.
   */
  const [detoured, setDetoured] = React.useState(false);

  React.useEffect(() => {
    if (ready && (!me.role || me.role === 'worker')) router.replace('/');
  }, [ready, me.role, router]);

  React.useEffect(() => { if (me.geo.address && !address) setAddress(me.geo.address); }, [me.geo.address]);

  const idx = STEPS.indexOf(step);
  /**
   * BUG: the booking always offered Bengaluru.
   *
   * Two causes. The location dropdown listed AREAS — a six-item Bengaluru
   * compatibility shim — instead of the user's own city. And `geo` was seeded
   * from `me.geo` in a useState initialiser, which runs on the FIRST render,
   * when the store is still empty and me.geo is the fallback. A customer in
   * Mumbai got Koramangala on both counts.
   *
   * Now: nothing is assumed until the profile has actually loaded, and then the
   * booking starts from where that profile says the person is.
   */
  React.useEffect(() => {
    if (!ready || geo) return;
    setGeo(me.geo);
    setAddress(me.geo.address ?? '');
  }, [ready, me.geo, geo]);

  /* Areas belong to the user's city, never a hardcoded list. */
  const localities = React.useMemo(
    () => city(geo?.cityId ?? me.geo.cityId ?? 'blr')?.localities ?? [],
    [geo?.cityId, me.geo.cityId]
  );

  const go = (s: Step) => setStep(s);

  /** After the description, let the AI propose a service and a duration. */
  async function afterDescribe() {
    setThinking(true);
    const parsed = await parseRequest(description, lang);
    if (!svc && parsed.serviceId) { setSvc(parsed.serviceId); setCat(parsed.category ?? null); }
    // Could not work out the trade from what they said — ask, do not guess.
    if (!svc && !parsed.serviceId) { setThinking(false); setDetoured(true); go('service'); return; }
    setDuration(durationFromHours(parsed.estimatedHours));
    setThinking(false);
    go('photos');
  }

  async function afterDuration() {
    const hours = DURATIONS.find((d) => d.id === duration)?.hours ?? 1;
    const urgency = timePref === 'asap' ? 'emergency' : timePref === 'today' ? 'today' : 'this_week';
    const p = await suggestPrice(svc ?? undefined, urgency, hours);
    setPrice(p);
    go('workers');
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhotos((p) => [...p, String(r.result)].slice(0, 4));
    r.readAsDataURL(f);
  }

  /* Only workers who genuinely do this service, inside their own radius. */
  const suitable = React.useMemo(() => {
    if (!svc || !cat || !geo) return [];
    const all = rankWorkers({ geo, category: cat, serviceId: svc }, db.workers);
    if (!preferredWorker) return all;
    return [...all].sort((a, b) => (a.worker.id === preferredWorker ? -1 : b.worker.id === preferredWorker ? 1 : 0));
  }, [svc, cat, geo, db.workers, preferredWorker]);

  function send() {
    if (!svc || !cat || !me.id || !me.role || me.role === 'worker' || !price || !geo) return;
    const hours = DURATIONS.find((d) => d.id === duration)?.hours ?? 1;
    const id = requestBooking({
      clientId: me.id,
      clientRole: me.role,
      title: description.trim().slice(0, 80) || serviceName(svc, lang),
      rawRequest: description.trim(),
      lang,
      category: cat,
      serviceId: svc,
      whenText: timePref === 'scheduled' ? scheduled : t(timePref === 'asap' ? 'b.asap' : timePref === 'today' ? 'u.today' : 'b.tomorrow'),
      timePref,
      scheduledAt: timePref === 'scheduled' && scheduled ? Date.parse(scheduled) || undefined : undefined,
      duration,
      photos,
      urgency: timePref === 'asap' ? 'emergency' : timePref === 'today' ? 'today' : 'this_week',
      estimatedHours: hours,
      geo: { ...geo, address: address.trim() || geo.address },
      priceMin: price.min,
      priceMax: price.max,
      priceBasis: price.basis,
    }, suitable.map((m) => m.worker.id));
    router.push(`/job/${id}`);
  }

  /* `geo` lands in the effect above, one tick after `ready`. */
  if (!ready || !geo) return <Shell><div className="page" style={{ paddingTop: 90 }}><CardSkeleton /></div></Shell>;

  const canNext =
    step === 'service'  ? !!svc :
    step === 'describe' ? description.trim().length > 3 :
    step === 'address'  ? address.trim().length > 2 : true;

  return (
    <Shell>
      <TopBar
        back={idx === 0 ? '/' : true}
        title={t('b.title')}
        subtitle={`${t('b.step')} ${idx + 1} ${t('b.of')} ${STEPS.length}`}
        right={<Ring value={Math.round(((idx + 1) / STEPS.length) * 100)} size="s" label={`${idx + 1}/${STEPS.length}`} />}
      />

      <main className="page book" style={{ paddingTop: 4 }}>
        <div className="book-card">
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={SPRING.soft}
            className="v-4"
          >
            {/* ---------------------------- 1. service ---------------------------- */}
            {step === 'service' ? (
              <>
                <h1 className="t-h1">{t('b.pickService')}</h1>
                {!cat ? (
                  <Stagger className="grid-2" gap={0.03}>
                    {CATEGORIES.map((c) => (
                      <StaggerItem key={c.id}>
                        <button className="choice" style={{ minHeight: 92, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
                          onClick={() => setCat(c.id)}>
                          <span style={{ fontSize: 26 }} aria-hidden>{c.icon}</span>
                          <span className="ttl" style={{ fontSize: 14.5, lineHeight: 1.25 }}>{categoryName(c.id, lang)}</span>
                        </button>
                      </StaggerItem>
                    ))}
                  </Stagger>
                ) : (
                  <>
                    <button className="btn quiet" style={{ alignSelf: 'flex-start' }} onClick={() => { setCat(null); setSvc(null); }}>
                      ← {t('s.back')}
                    </button>
                    <Stagger className="v-3" gap={0.04}>
                      {servicesOf(cat).map((s) => (
                        <StaggerItem key={s.id}>
                          <button className={`choice${svc === s.id ? ' on' : ''}`} style={{ minHeight: 66 }} onClick={() => setSvc(s.id)}>
                            <span className="lead" aria-hidden>{s.icon}</span>
                            <span className="ttl">{serviceName(s.id, lang)}</span>
                            {svc === s.id ? <span className="mark">✓</span> : null}
                          </button>
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </>
                )}
              </>
            ) : null}

            {/* ---------------------------- 2. describe ---------------------------- */}
            {step === 'describe' ? (
              <>
                <div>
                  <h1 className="t-h1">{t('b.describe')}</h1>
                  <p className="t-sm" style={{ marginTop: 6 }}>{t('b.describeSub')}</p>
                </div>
                {svc ? <span className="tag em">{service(svc)?.icon} {serviceName(svc, lang)}</span> : null}
                <VoiceField lang={lang} value={description} onChange={setDescription} placeholder={t('b.describePh')} orbSize={120} />
              </>
            ) : null}

            {/* ---------------------------- 3. photos ---------------------------- */}
            {step === 'photos' ? (
              <>
                <div>
                  <h1 className="t-h1">{t('b.photos')}</h1>
                  <p className="t-sm" style={{ marginTop: 6 }}>{t('b.photosSub')}</p>
                </div>
                <div className="grid-2">
                  {photos.map((src, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 16, border: '1px solid var(--glass-edge)' }} />
                      <button className="icon-btn" style={{ position: 'absolute', top: 6, right: 6, minWidth: 32, height: 32 }}
                        aria-label={t('c.cancel')} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  {photos.length < 4 ? (
                    <label className="choice" style={{ minHeight: 130, flexDirection: 'column', justifyContent: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: 28 }} aria-hidden>📷</span>
                      <span className="sub" style={{ textAlign: 'center' }}>{t('b.addPhoto')}</span>
                      <input type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
                    </label>
                  ) : null}
                </div>
              </>
            ) : null}

            {/* ---------------------------- 4. time ---------------------------- */}
            {step === 'time' ? (
              <>
                <h1 className="t-h1">{t('b.when')}</h1>
                <Stagger className="v-3" gap={0.04}>
                  {([
                    ['asap', '⚡', t('b.asap')],
                    ['today', '☀️', t('u.today')],
                    ['tomorrow', '🌤️', t('b.tomorrow')],
                    ['scheduled', '🗓️', t('b.schedule')],
                  ] as [TimePreference, string, string][]).map(([v, ic, label]) => (
                    <StaggerItem key={v}>
                      <button className={`choice${timePref === v ? ' on' : ''}`} onClick={() => setTimePref(v)}>
                        <span className="lead" aria-hidden>{ic}</span>
                        <span className="ttl">{label}</span>
                        {timePref === v ? <span className="mark">✓</span> : null}
                      </button>
                    </StaggerItem>
                  ))}
                </Stagger>
                {timePref === 'scheduled' ? (
                  <input className="input" type="datetime-local" value={scheduled}
                    onChange={(e) => setScheduled(e.target.value)} aria-label={t('b.schedule')} />
                ) : null}
              </>
            ) : null}

            {/* ---------------------------- 5. address ---------------------------- */}
            {step === 'address' ? (
              <>
                <div>
                  <h1 className="t-h1">{t('b.address')}</h1>
                  <p className="t-sm" style={{ marginTop: 6 }}>{t('b.addressSub')}</p>
                </div>
                {/* The city is already known from the profile. Confirm it, do
                    not re-ask it — and lead with the only thing that actually
                    varies per booking: which flat, which floor, which gate. */}
                <div className="note em">📍 {geo.areaName}</div>

                <input
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('b.flatPh')}
                  aria-label={t('b.address')}
                  autoFocus
                />

                <details className="glass flat pad-s">
                  <summary className="t-xs strong" style={{ cursor: 'pointer' }}>
                    ✏️ {t('c.changeCity')} · {t('c.area')}
                  </summary>
                  <div className="v-3" style={{ marginTop: 12 }}>
                    <button className="btn ghost sm" onClick={() => navigator.geolocation?.getCurrentPosition(
                      (p) => setGeo({ ...nearestArea(p.coords.latitude, p.coords.longitude), address }),
                      () => {}, { timeout: 8000 })}>
                      📍 {t('b.useCurrent')}
                    </button>
                    <select
                      className="input"
                      value={geo.cityId ?? 'blr'}
                      aria-label={t('c.city')}
                      onChange={(e) => {
                        const target = city(e.target.value);
                        if (target) setGeo({ ...geoOf(target.localities[0].id)!, address });
                      }}
                    >
                      {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                      className="input"
                      value={geo.localityId ?? ''}
                      aria-label={t('c.area')}
                      onChange={(e) => { const g = geoOf(e.target.value); if (g) setGeo({ ...g, address }); }}
                    >
                      {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </details>
              </>
            ) : null}

            {/* ---------------------------- 6. duration ---------------------------- */}
            {step === 'duration' ? (
              <>
                <div>
                  <h1 className="t-h1">{t('b.duration')}</h1>
                  <p className="t-sm" style={{ marginTop: 6 }}>{t('b.durationSub')}</p>
                </div>
                <Stagger className="v-3" gap={0.04}>
                  {DURATIONS.map((d) => (
                    <StaggerItem key={d.id}>
                      <button className={`choice${duration === d.id ? ' on' : ''}`} style={{ minHeight: 60 }}
                        onClick={() => setDuration(d.id)}>
                        <span className="lead" aria-hidden>⏱️</span>
                        <span className="ttl">{t(d.key)}</span>
                        {duration === d.id ? <span className="mark">✓</span> : null}
                      </button>
                    </StaggerItem>
                  ))}
                </Stagger>
              </>
            ) : null}

            {/* ---------------------------- 7. workers ---------------------------- */}
            {step === 'workers' ? (
              <>
                <div>
                  <h1 className="t-h1">{t('b.suitable')}</h1>
                  <p className="t-sm" style={{ marginTop: 6 }}>{t('b.suitableSub')}</p>
                </div>

                {/* what they are about to send */}
                <GlassCard className="flat pad">
                  <p className="t-micro" style={{ marginBottom: 10 }}>{t('b.summary')}</p>
                  {svc ? <div className="kv" style={{ paddingTop: 0 }}><span className="k">{t('s.pickService')}</span><span className="v">{serviceName(svc, lang)}</span></div> : null}
                  <div className="kv"><span className="k">{t('b.when')}</span><span className="v">{timePref === 'scheduled' ? scheduled || t('b.schedule') : t(timePref === 'asap' ? 'b.asap' : timePref === 'today' ? 'u.today' : 'b.tomorrow')}</span></div>
                  <div className="kv"><span className="k">{t('b.duration')}</span><span className="v">{t(DURATIONS.find((d) => d.id === duration)!.key)}</span></div>
                  <div className="kv"><span className="k">{t('j.address')}</span><span className="v">{address || geo.areaName}</span></div>
                  {photos.length ? <div className="kv"><span className="k">{t('b.photos')}</span><span className="v">{photos.length}</span></div> : null}
                  {price ? (
                    <>
                      <hr className="rule" style={{ margin: '12px 0' }} />
                      <div className="between">
                        <span className="t-xs">{t('p.estimate')}</span>
                        <span className="t-sm strong t-num"><Money amount={price.min} />–<Money amount={price.max} /></span>
                      </div>
                    </>
                  ) : null}
                </GlassCard>

                <div className="h-2 wrap" style={{ gap: 8 }}>
                  {TRUST_POINTS.map((p) => (
                    <span key={p.key} className="tag em" style={{ fontSize: 11.5 }}>{p.icon} {t(p.key as any)}</span>
                  ))}
                </div>

                {suitable.length === 0 ? (
                  <Empty text={t('b.noSuitable')} />
                ) : (
                  <Stagger className="v-3" gap={0.05}>
                    {suitable.slice(0, 6).map((m) => (
                      <StaggerItem key={m.worker.id}>
                        <GlassCard className="pad-s" glow={m.worker.id === preferredWorker ? 'em' : undefined}>
                          <div className="h" style={{ gap: 12 }}>
                            <Initials name={m.worker.name} size="s" />
                            <div className="grow" style={{ minWidth: 0 }}>
                              <div className="t-sm strong">{m.worker.name}</div>
                              <div className="t-xs" style={{ marginTop: 2 }}>
                                📍 {formatDistance(m.km, t('c.nearby'))} · ~{etaMinutes(m.km)} {t('c.min')} · {m.worker.jobsCompleted} {t('w.jobsDone')}
                              </div>
                            </div>
                            <VerifiedBadge v={m.worker.verification} small />
                          </div>
                        </GlassCard>
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </>
            ) : null}
          </motion.section>
        </AnimatePresence>
        </div>

        {/* ---------------------------- footer ----------------------------
            Inside its own bar rather than loose in the page flow. The button
            used to sit directly after an animating section, so every step
            change moved it — which is what made it look detached. */}
        <div className="book-actions">
        {step !== 'workers' ? (
          <button
            className="btn"
            disabled={!canNext || thinking}
            onClick={() => {
              if (step === 'describe') return afterDescribe();
              if (step === 'duration') return afterDuration();
              /* resume forward after the trade detour instead of re-asking */
              if (step === 'service' && detoured) { setDetoured(false); return go('photos'); }
              go(STEPS[idx + 1]);
            }}
          >
            {thinking ? '…' : t('c.continue')}
          </button>
        ) : (
          <button className="btn" disabled={suitable.length === 0} onClick={send}>
            📩 {t('b.send')}
          </button>
        )}

        {step !== 'service' && step !== 'workers' && step !== 'describe' && step !== 'address' ? (
          <button className="btn quiet" onClick={() => go(STEPS[idx + 1])}>{t('c.skip')}</button>
        ) : null}
        </div>
      </main>
    </Shell>
  );
}
