'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RANGES, bestMonth, lifetime, summarise, type RangeId } from '@/lib/earnings';
import { useMe, useStore, useT } from '@/components/store';
import { Dock, GlassCard, Reveal } from '@/components/aurora';
import { Empty, HeaderTools, Money, Panel, Shell, TopBar } from '@/components/kit';
import { EarningsChart } from '@/components/chart';
import { StatRow } from '@/components/panels';
import { navWorker } from '@/components/nav';

/**
 * EARNINGS
 *
 * The screen a worker opens most after the job feed. It answers, in this
 * order: how much did I make, over what, and which period was my best.
 *
 * Exactly one hero number — the selected range's total. Everything else is a
 * supporting tile, because a dashboard with four competing 48px numbers has no
 * headline at all.
 */
export default function EarningsPage() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useMe();
  const { t } = useT();
  const [range, setRange] = React.useState<RangeId>('d30');
  /* Read the clock once per render pass rather than per calculation, so every
     number on the screen describes the same instant. */
  const [now, setNow] = React.useState(0);

  React.useEffect(() => { setNow(Date.now()); }, [range]);
  React.useEffect(() => { if (ready && me.role !== 'worker') router.replace('/'); }, [ready, me.role, router]);

  if (!ready || !me.worker || !now) {
    return <Shell><main className="page" style={{ paddingTop: 100 }}><Empty icon="⏳" text={t('c.loading')} /></main></Shell>;
  }

  const w = me.worker;
  const s = summarise(db.jobs, w.id, range, now);
  const life = lifetime(db.jobs, w.id);
  const best = bestMonth(db.jobs, w.id);

  return (
    <Shell aside={
      <>
        <Panel title={t('e.lifetime')} icon="🏆">
          <StatRow label={t('e.earned')} value={<Money amount={life.total} />} />
          <StatRow label={t('d.finished')} value={life.jobs} />
          {best ? <StatRow label={t('e.bestMonth')} value={<Money amount={best.amount} />} hint={best.label} /> : null}
        </Panel>
        <Panel title={t('d.help')} icon="🛟">
          <p className="t-xs">{t('y.noteProtected')}</p>
        </Panel>
      </>
    }>
      <TopBar glassy back title={t('e.title')} subtitle={w.name} right={<HeaderTools />} />
      <main className="page v-4" style={{ paddingTop: 4 }}>

        {/* range first — it governs everything below it */}
        <div className="scroll-x">
          {RANGES.map((r) => (
            <button key={r.id} className={`chip${range === r.id ? ' on' : ''}`} onClick={() => setRange(r.id)}>
              {t(r.key as any)}
            </button>
          ))}
        </div>

        <Reveal>
          <GlassCard className="pad v-4">
            {/* the one hero number on this screen */}
            <div>
              <p className="t-micro">{t('e.earned')} · {t(RANGES.find((r) => r.id === range)!.key as any)}</p>
              <p className="hero t-num"><Money amount={s.total} /></p>
            </div>

            <EarningsChart buckets={s.buckets} best={s.best} />
          </GlassCard>
        </Reveal>

        <div className="grid-2">
          <GlassCard className="pad-s mid">
            <div className="stat">
              <div className="n t-num">{s.jobs}</div>
              <div className="l">{t('d.finished')}</div>
            </div>
          </GlassCard>
          <GlassCard className="pad-s mid">
            <div className="stat">
              <div className="n t-num"><Money amount={s.average} /></div>
              <div className="l">{t('e.perJob')}</div>
            </div>
          </GlassCard>
        </div>

        {/* lifetime lives in the right panel on a desktop; on a phone it goes here */}
        <GlassCard className="pad v-3 desk-hide">
          <h2 className="t-h3">🏆 {t('e.lifetime')}</h2>
          <div className="kv" style={{ paddingTop: 0 }}>
            <span className="k">{t('e.earned')}</span>
            <span className="v t-num"><Money amount={life.total} /></span>
          </div>
          <div className="kv">
            <span className="k">{t('d.finished')}</span>
            <span className="v t-num">{life.jobs}</span>
          </div>
          {best ? (
            <div className="kv">
              <span className="k">{t('e.bestMonth')}</span>
              <span className="v t-num"><Money amount={best.amount} /> · {best.label}</span>
            </div>
          ) : null}
        </GlassCard>
      </main>
      <Dock items={navWorker(t)} />
    </Shell>
  );
}
