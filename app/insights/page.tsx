'use client';

import React from 'react';
import { CATEGORIES } from '@/lib/ai/taxonomy';
import { AREAS } from '@/lib/geo';
import { useStore, useT } from '@/components/store';
import { Loading, Shell, TopBar } from '@/components/ui';

/**
 * AI FEATURE #9 - Community demand analytics.
 * Every posted job and registered worker is a data point about what a
 * neighbourhood needs. This is the view an RWA, an NGO or a municipal skilling
 * office would actually use to decide where to run a training camp.
 */
export default function Insights() {
  const { db, ready } = useStore();
  const { t } = useT();

  const rows = React.useMemo(() => {
    return CATEGORIES.filter((c) => c.id !== 'other')
      .map((c) => {
        const demand = db.jobs.filter((j) => j.category === c.id).length;
        const supply = db.workers.filter((w) => w.category === c.id).length;
        const ratio = supply === 0 ? (demand > 0 ? 99 : 0) : demand / supply;
        return { c, demand, supply, ratio };
      })
      .sort((a, b) => b.ratio - a.ratio || b.demand - a.demand);
  }, [db.jobs, db.workers]);

  const areaRows = React.useMemo(() => {
    return AREAS.map((a) => ({
      area: a.areaName,
      jobs: db.jobs.filter((j) => j.geo.areaName === a.areaName).length,
      workers: db.workers.filter((w) => w.geo.areaName === a.areaName).length,
    }))
      .filter((r) => r.jobs + r.workers > 0)
      .sort((a, b) => b.jobs - a.jobs);
  }, [db.jobs, db.workers]);

  const maxCount = Math.max(1, ...rows.map((r) => Math.max(r.demand, r.supply)));
  const completed = db.jobs.filter((j) => j.status === 'completed').length;

  if (!ready) return <Shell><Loading text="…" /></Shell>;

  return (
    <Shell wide>
      <TopBar title={t('ins.title')} subtitle={t('ins.sub')} back="/" />
      <div className="page stack">
        <div className="grid3">
          <div className="stat"><div className="n">{db.jobs.length}</div><div className="l">{t('ins.demand')}</div></div>
          <div className="stat"><div className="n">{db.workers.length}</div><div className="l">{t('ins.supply')}</div></div>
          <div className="stat"><div className="n">{completed}</div><div className="l">{t('st.completed')}</div></div>
        </div>

        <div className="card">
          <h3 className="title">📈 {t('ins.demand')} vs {t('ins.supply')}</h3>
          <div className="spacer" />
          {rows.map(({ c, demand, supply, ratio }) => {
            const label =
              ratio >= 1.5 ? t('ins.short') : ratio >= 0.6 ? t('ins.ok') : t('ins.surplus');
            const tone = ratio >= 1.5 ? 'red' : ratio >= 0.6 ? 'amber' : 'green';
            return (
              <div key={c.id} style={{ marginBottom: 16 }}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="bold">{c.icon} {t(`cat.${c.id}` as any)}</span>
                  <span className={`pill ${tone}`}>{label}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="tiny" style={{ width: 58 }}>{t('ins.demand')}</span>
                  <div className="bar grow"><span style={{ width: `${(demand / maxCount) * 100}%`, background: 'var(--accent)' }} /></div>
                  <span className="tiny bold" style={{ width: 20, textAlign: 'right' }}>{demand}</span>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 5 }}>
                  <span className="tiny" style={{ width: 58 }}>{t('ins.supply')}</span>
                  <div className="bar grow"><span style={{ width: `${(supply / maxCount) * 100}%` }} /></div>
                  <span className="tiny bold" style={{ width: 20, textAlign: 'right' }}>{supply}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3 className="title">🏘️ {t('ins.areas')}</h3>
          <div className="spacer" />
          {areaRows.map((r) => (
            <div className="kv" key={r.area}>
              <span className="k">{r.area}</span>
              <span className="v">{r.jobs} {t('ins.demand').toLowerCase()} · {r.workers} {t('ins.supply').toLowerCase()}</span>
            </div>
          ))}
        </div>

        <div className="banner">
          💡 With real usage this page tells an NGO exactly where to run a skilling camp — for example
          &ldquo;{rows[0] ? t(`cat.${rows[0].c.id}` as any) : '—'}&rdquo; is the biggest gap right now.
        </div>
      </div>
    </Shell>
  );
}
