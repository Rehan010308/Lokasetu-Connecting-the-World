'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { identifyScrap, type ScrapResult } from '@/lib/ai/scrap';
import { rankWorkers } from '@/lib/ai/matching';
import { formatKm } from '@/lib/geo';
import { useActions, useCurrentResident, useStore, useT } from '@/components/store';
import { Avatar, Loading, Money, ResidentTabs, Shell, TopBar } from '@/components/ui';

/**
 * AI FEATURE #8 - Raddiwala (scrap collector) flow.
 * Photo in, materials + fair value out, nearby collectors notified.
 */
export default function Scrap() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useCurrentResident();
  const { t } = useT();
  const { postJob } = useActions();

  const [preview, setPreview] = React.useState<string>('');
  const [file, setFile] = React.useState<{ name: string; size: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ScrapResult | null>(null);
  const [postedId, setPostedId] = React.useState<string | null>(null);

  const job = postedId ? db.jobs.find((j) => j.id === postedId) : null;
  const collectors = React.useMemo(
    () => (job ? rankWorkers(job, db.workers.filter((w) => w.category === 'raddiwala')) : []),
    [job, db.workers]
  );

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile({ name: f.name, size: f.size });
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(f);
    setBusy(true);
    setResult(await identifyScrap({ name: f.name, size: f.size }));
    setBusy(false);
  }

  function post() {
    if (!me || !result) return;
    const id = postJob({
      residentId: me.id,
      title: `Scrap pickup: ${result.items.map((i) => i.material).join(', ')}`,
      rawRequest: 'Scrap pickup requested from photo',
      lang: me.lang,
      category: 'raddiwala',
      skills: ['Doorstep pickup'],
      urgency: 'flexible',
      estimatedHours: 1,
      geo: me.geo,
      priceMin: Math.round(result.totalValue * 0.85),
      priceMax: Math.round(result.totalValue * 1.1),
      priceBasis: 'estimated from photo • current local scrap rates',
      isScrap: true,
      scrapItems: result.items,
    });
    setPostedId(id);
  }

  if (!ready) return <Shell><Loading text="…" /></Shell>;

  return (
    <Shell>
      <TopBar title={t('scrap.title')} back="/" />
      <div className="page stack">
        <p className="sub">{t('scrap.sub')}</p>

        {!result ? (
          <label className="card tap" style={{ display: 'block', textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 46 }}>📷</div>
            <div className="bold" style={{ marginTop: 8 }}>{t('scrap.upload')}</div>
            <input type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
          </label>
        ) : null}

        {busy ? <Loading text={t('scrap.analyzing')} /> : null}

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="scrap" style={{ width: '100%', borderRadius: 16, border: '1px solid var(--line)' }} />
        ) : null}

        {result && !busy ? (
          <>
            <div className="card">
              <h3 className="title">♻️ {t('scrap.detected')}</h3>
              <div className="spacer" />
              {result.items.map((it) => (
                <div className="kv" key={it.material}>
                  <span className="k">{it.material} · ~{it.approxKg} kg</span>
                  <span className="v"><Money amount={it.approxKg * it.ratePerKg} /> <span className="tiny">(₹{it.ratePerKg}/kg)</span></span>
                </div>
              ))}
              <div className="divider" style={{ margin: '12px 0' }} />
              <div className="tiny">{t('scrap.value')}</div>
              <div className="price"><Money amount={result.totalValue} /></div>
              <div className="tiny" style={{ marginTop: 6 }}>ℹ️ {result.note}</div>
            </div>

            {!postedId ? (
              me ? (
                <button className="btn" onClick={post}>📞 {t('scrap.post')}</button>
              ) : (
                <button className="btn" onClick={() => router.push('/resident/login')}>
                  {t('scrap.post')} — sign in
                </button>
              )
            ) : null}
          </>
        ) : null}

        {postedId ? (
          <>
            <div className="banner">✅ Request sent to nearby collectors.</div>
            {collectors.map((m) => (
              <div key={m.worker.id} className="card">
                <div className="row" style={{ gap: 12 }}>
                  <Avatar name={m.worker.name} />
                  <div className="grow">
                    <div className="bold">{m.worker.name}</div>
                    <div className="tiny">📍 {formatKm(m.km)} · ⭐ {m.worker.trust.overall.toFixed(1)} · 📞 {m.worker.phone}</div>
                  </div>
                  <div className="score">{m.score}</div>
                </div>
              </div>
            ))}
            {collectors.length === 0 ? <div className="banner warn">No collectors registered near this area yet.</div> : null}
          </>
        ) : null}
      </div>
      {me ? <ResidentTabs /> : null}
    </Shell>
  );
}
