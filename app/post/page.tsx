'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseRequest, type MissingField, type ParsedRequest } from '@/lib/ai/request';
import { suggestPrice } from '@/lib/ai/pricing';
import { servicesOf, service, matchServices, type CategoryId } from '@/lib/catalog';
import { serviceName } from '@/lib/i18n-catalog';
import { AREAS, nearestArea } from '@/lib/geo';
import type { Geo } from '@/lib/types';
import { useActions, useMe, useStore, useT } from '@/components/store';
import { VoiceField, HeaderTools, Money, Shell, TopBar } from '@/components/kit';
import { CardSkeleton, GlassCard, Reveal, SPRING, Stagger, StaggerItem } from '@/components/aurora';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export default function PostPage() {
  return (
    <Suspense fallback={<Shell><div className="page" style={{ paddingTop: 90 }}><CardSkeleton /></div></Shell>}>
      <Post />
    </Suspense>
  );
}

type Step = 'describe' | 'ask' | 'review' | 'done';

function Post() {
  const router = useRouter();
  const params = useSearchParams();
  const { db } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const { postJob, hire } = useActions();
  const reduce = useReducedMotion();

  const preferredWorker = params.get('worker') ?? undefined;
  const preselectedSvc = params.get('svc') ?? undefined;

  const [step, setStep] = React.useState<Step>('describe');
  const [text, setText] = React.useState(params.get('q') ?? '');
  const [busy, setBusy] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedRequest | null>(null);

  /* answers the AI had to ASK for rather than assume */
  const [svc, setSvc] = React.useState<string | undefined>(preselectedSvc);
  const [whenText, setWhenText] = React.useState('');
  const [budget, setBudget] = React.useState('');
  const [address, setAddress] = React.useState(me.geo.address ?? '');
  const [geo, setGeo] = React.useState<Geo>(me.geo);
  const [price, setPrice] = React.useState<{ min: number; max: number; basis: string } | null>(null);
  const [queue, setQueue] = React.useState<MissingField[]>([]);
  const [jobId, setJobId] = React.useState<string | null>(null);

  async function analyse() {
    if (!text.trim()) return;
    setBusy(true);
    const p = await parseRequest(text, lang);
    setParsed(p);
    if (p.serviceId && !svc) setSvc(p.serviceId);
    if (p.whenText) setWhenText(p.whenText);
    if (p.budgetMin) setBudget(String(Math.round((p.budgetMin + (p.budgetMax ?? p.budgetMin)) / 2)));
    if (p.address) setAddress(p.address);

    // Only ask for what is genuinely missing. Never assume.
    const need = p.missing.filter((f) => {
      if (f === 'service') return !svc && !p.serviceId;
      if (f === 'where') return !address.trim() && !p.address;
      return true;
    });
    setQueue(need);
    setBusy(false);
    setStep(need.length ? 'ask' : 'review');
    if (!need.length) await computePrice(p, svc ?? p.serviceId);
  }

  async function computePrice(p: ParsedRequest, serviceId?: string) {
    const done = db.jobs.filter((j) => j.serviceId === serviceId && j.status === 'completed' && j.agreedAmount);
    const avg = done.length ? done.reduce((s, j) => s + (j.agreedAmount as number), 0) / done.length : undefined;
    const r = await suggestPrice(serviceId, p.urgency, p.estimatedHours, avg);
    setPrice(r);
  }

  async function answered() {
    const rest = queue.slice(1);
    setQueue(rest);
    if (!rest.length && parsed) {
      await computePrice(parsed, svc);
      setStep('review');
    }
  }

  function publish() {
    if (!parsed || !me.id || !me.role || me.role === 'worker') return;
    const b = parseInt(budget || '0', 10);
    const id = postJob({
      clientId: me.id,
      clientRole: me.role,
      title: text.trim().slice(0, 80),
      rawRequest: text.trim(),
      lang,                                   // the request keeps the language it was spoken in
      category: (service(svc ?? '')?.category ?? parsed.category ?? 'maintenance') as CategoryId,
      serviceId: svc,
      whenText: whenText || undefined,
      budgetMin: b ? Math.round(b * 0.85) : undefined,
      budgetMax: b ? Math.round(b * 1.15) : undefined,
      urgency: parsed.urgency,
      estimatedHours: parsed.estimatedHours,
      geo: { ...geo, address: address.trim() || geo.address },
      priceMin: price?.min ?? 0,
      priceMax: price?.max ?? 0,
      priceBasis: price?.basis ?? '',
      status: 'open',
    });
    // Came here from a worker profile? Assign them straight away.
    if (preferredWorker) hire(id, preferredWorker, Math.round(((price?.min ?? 0) + (price?.max ?? 0)) / 2));
    setJobId(id);
    setStep('done');
  }

  const current = queue[0];
  const candidates = parsed?.candidates?.length
    ? parsed.candidates
    : parsed?.category ? servicesOf(parsed.category).map((s) => s.id) : [];

  return (
    <Shell>
      <TopBar back title={t('p.title')} right={<HeaderTools />} />
      <main className="page v-4" style={{ paddingTop: 4 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step + (current ?? '')}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={SPRING.soft}
            className="v-4"
          >
            {/* ------------------------------ describe ------------------------------ */}
            {step === 'describe' ? (
              <>
                <div>
                  <h1 className="t-h1">{t('p.title')}</h1>
                  <p className="t-sm" style={{ marginTop: 6 }}>{t('p.sub')}</p>
                </div>
                <VoiceField lang={lang} value={text} onChange={setText} placeholder={t('p.ph')} />
                <button className="btn" disabled={!text.trim() || busy} onClick={analyse}>
                  {busy ? '…' : `✨ ${t('p.find')}`}
                </button>
              </>
            ) : null}

            {/* --------------------- follow-up questions, one at a time --------------------- */}
            {step === 'ask' && current ? (
              <>
                <GlassCard className="pad-s">
                  <p className="t-xs">🎙️</p>
                  <p className="t-sm" style={{ color: 'var(--ink)', marginTop: 4 }}>&ldquo;{text}&rdquo;</p>
                </GlassCard>

                <h2 className="t-h2">
                  {current === 'service' ? t('p.askService')
                    : current === 'when' ? t('p.askWhen')
                    : current === 'budget' ? t('p.askBudget')
                    : t('p.askWhere')}
                </h2>

                {current === 'service' ? (
                  <Stagger className="v-3" gap={0.04}>
                    {candidates.slice(0, 6).map((id) => (
                      <StaggerItem key={id}>
                        <button className={`choice${svc === id ? ' on' : ''}`} style={{ minHeight: 62 }}
                          onClick={() => { setSvc(id); }}>
                          <span className="lead" aria-hidden>{service(id)?.icon ?? '🛠️'}</span>
                          <span className="ttl">{serviceName(id, lang)}</span>
                          {svc === id ? <span className="mark">✓</span> : null}
                        </button>
                      </StaggerItem>
                    ))}
                  </Stagger>
                ) : null}

                {current === 'when' ? (
                  <div className="h-2 wrap" style={{ gap: 8 }}>
                    {(['u.emergency', 'u.today', 'av.weekdays', 'u.this_week'] as const).map((k) => (
                      <button key={k} className={`chip${whenText === t(k) ? ' on' : ''}`} onClick={() => setWhenText(t(k))}>
                        {t(k)}
                      </button>
                    ))}
                    <input className="input" style={{ marginTop: 8 }} value={whenText}
                      onChange={(e) => setWhenText(e.target.value)} placeholder={t('p.askWhen')} />
                  </div>
                ) : null}

                {current === 'budget' ? (
                  <>
                    <input className="input" inputMode="numeric" value={budget}
                      onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} placeholder="₹" />
                    <button className="btn ghost" onClick={() => { setBudget(''); answered(); }}>
                      {t('p.budgetSkip')}
                    </button>
                  </>
                ) : null}

                {current === 'where' ? (
                  <>
                    <input className="input" value={address} onChange={(e) => setAddress(e.target.value)}
                      placeholder={t('p.wherePh')} />
                    <button className="btn ghost md" style={{ width: '100%' }}
                      onClick={() => navigator.geolocation?.getCurrentPosition(
                        (p) => setGeo(nearestArea(p.coords.latitude, p.coords.longitude)), () => {}, { timeout: 8000 })}>
                      📍 {t('c.search')}
                    </button>
                    <select className="select" value={geo.areaName}
                      onChange={(e) => { const a = AREAS.find((x) => x.areaName === e.target.value); if (a) setGeo({ ...a, address }); }}>
                      {AREAS.map((a) => <option key={a.areaName} value={a.areaName}>{a.areaName}</option>)}
                    </select>
                  </>
                ) : null}

                <button
                  className="btn"
                  disabled={
                    (current === 'service' && !svc) ||
                    (current === 'when' && !whenText.trim()) ||
                    (current === 'where' && !address.trim())
                  }
                  onClick={answered}
                >
                  {t('c.continue')}
                </button>
              </>
            ) : null}

            {/* ------------------------------ review ------------------------------ */}
            {step === 'review' && parsed ? (
              <>
                <h2 className="t-h2">{t('p.review')}</h2>
                <GlassCard className="pad">
                  <p className="t-sm" style={{ color: 'var(--ink)' }}>&ldquo;{text}&rdquo;</p>
                  <hr className="rule" style={{ margin: '13px 0' }} />
                  {svc ? <div className="kv"><span className="k">{t('s.pickService')}</span><span className="v">{serviceName(svc, lang)}</span></div> : null}
                  {whenText ? <div className="kv"><span className="k">{t('p.askWhen')}</span><span className="v">{whenText}</span></div> : null}
                  <div className="kv"><span className="k">{t('j.address')}</span><span className="v">{address || geo.areaName}</span></div>
                  {budget ? <div className="kv"><span className="k">{t('p.askBudget')}</span><span className="v t-num">₹{budget}</span></div> : null}
                </GlassCard>

                {price ? (
                  <GlassCard className="pad" glow="em">
                    <p className="t-xs">{t('p.estimate')}</p>
                    <p className="price"><Money amount={price.min} />–<Money amount={price.max} /></p>
                    <p className="t-xs" style={{ marginTop: 6 }}>ℹ️ {price.basis}</p>
                  </GlassCard>
                ) : null}

                <button className="btn" onClick={publish}>✓ {t('p.publish')}</button>
                <button className="btn quiet" onClick={() => setStep('describe')}>{t('c.back')}</button>
              </>
            ) : null}

            {/* ------------------------------ done ------------------------------ */}
            {step === 'done' && jobId ? (
              <Reveal>
                <GlassCard className="pad-l mid v-4" glow="em">
                  <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING.bouncy} style={{ fontSize: 50 }}>✅</motion.div>
                  <h2 className="t-h1">{t('p.posted')}</h2>
                  <p className="t-sm">{t('p.postedSub')}</p>
                  <button className="btn" onClick={() => router.push(`/job/${jobId}`)}>{t('c.continue')} →</button>
                </GlassCard>
              </Reveal>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </Shell>
  );
}
