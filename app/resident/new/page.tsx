'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AREAS, nearestArea } from '@/lib/geo';
import { parseJobRequest, type ParsedJob } from '@/lib/ai/jobs';
import { suggestPrice, type PriceSuggestion } from '@/lib/ai/pricing';
import { CATEGORIES, categoryById } from '@/lib/ai/taxonomy';
import type { CategoryId, Geo, Urgency } from '@/lib/types';
import { useActions, useCurrentResident, useStore, useT } from '@/components/store';
import { VoiceInput } from '@/components/voice';
import { Loading, Money, ResidentTabs, Shell, TopBar } from '@/components/ui';

export default function NewRequest() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useCurrentResident();
  const { t, lang } = useT();
  const { postJob, setResidentGeo } = useActions();

  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedJob | null>(null);
  const [price, setPrice] = React.useState<PriceSuggestion | null>(null);
  const [geo, setGeo] = React.useState<Geo>(AREAS[0]);

  React.useEffect(() => {
    if (ready && !me) router.replace('/resident/login');
    if (me) setGeo(me.geo);
  }, [ready, me, router]);

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true);
    const p = await parseJobRequest(text, lang);
    // Feed real local history into the estimate when we have it.
    const history = db.jobs
      .filter((j) => j.category === p.category && j.status === 'completed' && j.agreedAmount)
      .map((j) => j.agreedAmount as number);
    const avg = history.length ? history.reduce((a, b) => a + b, 0) / history.length : undefined;
    const pr = await suggestPrice(p.category, p.urgency, p.estimatedHours, avg);
    setParsed(p);
    setPrice(pr);
    setBusy(false);
  }

  function useGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo(nearestArea(pos.coords.latitude, pos.coords.longitude)),
      () => {},
      { timeout: 8000 }
    );
  }

  function submit() {
    if (!me || !parsed || !price) return;
    setResidentGeo(me.id, geo);
    const id = postJob({
      residentId: me.id,
      title: parsed.title,
      rawRequest: text,
      lang,
      category: parsed.category,
      skills: parsed.skills,
      urgency: parsed.urgency,
      estimatedHours: parsed.estimatedHours,
      geo,
      priceMin: price.min,
      priceMax: price.max,
      priceBasis: price.basis,
    });
    router.push(`/resident/job/${id}`);
  }

  if (!ready || !me) return <Shell><Loading text="…" /></Shell>;

  return (
    <Shell>
      <TopBar title={t('r.nav.post')} back="/resident" />
      <div className="page stack-lg">
        {!parsed ? (
          <>
            <div>
              <h2 className="title">{t('r.post.title')}</h2>
              <p className="sub">{t('r.post.sub')}</p>
            </div>
            <VoiceInput
              lang={lang}
              value={text}
              onChange={setText}
              hint={t('r.post.ph')}
              micLabel={t('r.post.speak')}
            />
            <button className="btn" disabled={!text.trim() || busy} onClick={analyze}>
              {busy ? '🧠 …' : `✨ ${t('r.post.analyze')}`}
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="title">{t('r.review.title')}</h2>
              <p className="sub">&ldquo;{text}&rdquo;</p>
            </div>

            <div className="card">
              <div className="kv">
                <span className="k">{t('r.review.type')}</span>
                <span className="v">
                  {categoryById(parsed.category).icon} {t(`cat.${parsed.category}` as any)}
                </span>
              </div>
              <div className="kv">
                <span className="k">{t('r.review.urgency')}</span>
                <span className="v">{t(`u.${parsed.urgency}` as any)}</span>
              </div>
              <div className="kv">
                <span className="k">{t('r.review.duration')}</span>
                <span className="v">{parsed.estimatedHours} h</span>
              </div>
              {parsed.skills.length ? (
                <div className="chips" style={{ marginTop: 12 }}>
                  {parsed.skills.map((s) => <span key={s} className="chip on">{s}</span>)}
                </div>
              ) : null}
            </div>

            {price ? (
              <div className="card">
                <div className="tiny">{t('r.review.price')}</div>
                <div className="price">
                  <Money amount={price.min} /> – <Money amount={price.max} />
                </div>
                <div className="tiny" style={{ marginTop: 6 }}>ℹ️ {price.basis}</div>
              </div>
            ) : null}

            <details className="card flat">
              <summary className="tiny bold" style={{ cursor: 'pointer' }}>✏️ Change job type or urgency</summary>
              <div className="chips" style={{ marginTop: 12 }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className={`chip${c.id === parsed.category ? ' on' : ''}`}
                    onClick={async () => {
                      const next = { ...parsed, category: c.id as CategoryId };
                      setParsed(next);
                      setPrice(await suggestPrice(next.category, next.urgency, next.estimatedHours));
                    }}
                  >
                    {c.icon} {t(`cat.${c.id}` as any)}
                  </button>
                ))}
              </div>
              <div className="chips" style={{ marginTop: 12 }}>
                {(['emergency', 'today', 'this_week', 'flexible'] as Urgency[]).map((u) => (
                  <button
                    key={u}
                    className={`chip${u === parsed.urgency ? ' on' : ''}`}
                    onClick={async () => {
                      const next = { ...parsed, urgency: u };
                      setParsed(next);
                      setPrice(await suggestPrice(next.category, u, next.estimatedHours));
                    }}
                  >
                    {t(`u.${u}` as any)}
                  </button>
                ))}
              </div>
            </details>

            <div className="card">
              <label className="lbl">📍 {t('ob.loc.title')}</label>
              <button className="btn secondary sm" style={{ width: '100%' }} onClick={useGps}>
                📍 {t('ob.loc.gps')}
              </button>
              <select
                className="select"
                style={{ marginTop: 10 }}
                value={geo.areaName}
                onChange={(e) => {
                  const a = AREAS.find((x) => x.areaName === e.target.value);
                  if (a) setGeo(a);
                }}
              >
                {AREAS.map((a) => <option key={a.areaName} value={a.areaName}>{a.areaName}</option>)}
              </select>
            </div>

            <button className="btn" onClick={submit}>✓ {t('r.review.post')}</button>
            <button className="btn ghost" onClick={() => { setParsed(null); setPrice(null); }}>
              {t('c.back')}
            </button>
          </>
        )}
      </div>
      <ResidentTabs />
    </Shell>
  );
}
