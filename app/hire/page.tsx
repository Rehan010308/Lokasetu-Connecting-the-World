'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, servicesOf, service } from '@/lib/catalog';
import { categoryName, serviceName } from '@/lib/i18n-catalog';
import { suggestPrice } from '@/lib/ai/pricing';
import { rankWorkers } from '@/lib/ai/match';
import type { CategoryId } from '@/lib/catalog';
import { useActions, useMe, useStore, useT } from '@/components/store';
import { Dock, GlassCard, Reveal, Stagger, StaggerItem } from '@/components/aurora';
import { Empty, HeaderTools, Money, Shell, TopBar } from '@/components/kit';
import { navNormal } from '@/components/nav';

/**
 * Bulk hiring for societies and businesses.
 *
 * Different from a household request in three ways that matter: it is usually
 * recurring, it is usually for more than one person, and the person posting is
 * spending someone else's money — so the estimate has to be per-person and
 * per-period, not a single number.
 */

/* The roles each org type actually hires, so nobody scrolls past 13 categories. */
const SOCIETY_CATS: CategoryId[] = ['maintenance', 'security', 'cleaning', 'gardening', 'plumbing', 'electrical'];
const BUSINESS_CATS: CategoryId[] = ['shop', 'driving', 'cleaning', 'security', 'electrical'];

type Duration = 'oneTime' | 'daily' | 'monthly';

export default function HirePage() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useMe();
  const { t, lang } = useT();
  const { requestBooking } = useActions();

  const isSociety = me.role === 'society';
  const cats = (isSociety ? SOCIETY_CATS : BUSINESS_CATS).map((id) => CATEGORIES.find((c) => c.id === id)!).filter(Boolean);

  const [cat, setCat] = React.useState<CategoryId | null>(null);
  const [svc, setSvc] = React.useState<string | null>(null);
  const [count, setCount] = React.useState(1);
  const [duration, setDuration] = React.useState<Duration>('monthly');
  const [price, setPrice] = React.useState<{ min: number; max: number } | null>(null);

  React.useEffect(() => {
    if (ready && me.role !== 'society' && me.role !== 'business') router.replace('/');
  }, [ready, me.role, router]);

  React.useEffect(() => {
    let dead = false;
    (async () => {
      if (!svc) { setPrice(null); return; }
      const hours = duration === 'oneTime' ? 4 : 8;
      const p = await suggestPrice(svc, 'this_week', hours);
      if (!dead) setPrice({ min: p.min * count, max: p.max * count });
    })();
    return () => { dead = true; };
  }, [svc, count, duration]);

  if (!ready || (me.role !== 'society' && me.role !== 'business')) {
    return <Shell><main className="page" style={{ paddingTop: 100 }}><Empty icon="⏳" text={t('c.loading')} /></main></Shell>;
  }

  const available = svc
    ? rankWorkers({ geo: me.geo, category: cat!, serviceId: svc }, db.workers).length
    : 0;

  function publish() {
    if (!svc || !cat || !me.id) return;
    const label = serviceName(svc, lang);
    const id = requestBooking({
      clientId: me.id,
      clientRole: me.role as 'society' | 'business',
      title: `${label} × ${count} — ${t(`g.${duration}`)}`,
      rawRequest: `${me.client?.orgName ?? ''}: ${label}, ${count} ${t('g.staffCount')}, ${t(`g.${duration}`)}`,
      lang,
      category: cat,
      serviceId: svc,
      whenText: t(`g.${duration}`),
      urgency: 'this_week',
      estimatedHours: duration === 'oneTime' ? 4 : 8,
      geo: me.geo,
      priceMin: price?.min ?? 0,
      priceMax: price?.max ?? 0,
      priceBasis: `${count} × ${label} · ${t(`g.${duration}`)}`,
    }, rankWorkers({ geo: me.geo, category: cat, serviceId: svc }, db.workers).map((m) => m.worker.id));
    router.push(`/job/${id}`);
  }

  return (
    <Shell>
      <TopBar
        glassy back="/"
        title={t(isSociety ? 'g.socTitle' : 'g.bizTitle')}
        subtitle={me.client?.orgName}
        right={<HeaderTools />}
      />
      <main className="page v-4" style={{ paddingTop: 4 }}>
        <p className="t-sm">{t(isSociety ? 'g.socSub' : 'g.bizSub')}</p>

        {/* ---- what role ---- */}
        <section className="v-3">
          <h2 className="t-h3">{t('g.hireFor')}</h2>
          <Stagger className="grid-2" gap={0.04}>
            {cats.map((c) => (
              <StaggerItem key={c.id}>
                <button
                  className={`choice${cat === c.id ? ' on' : ''}`}
                  style={{ minHeight: 76, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
                  onClick={() => { setCat(c.id); setSvc(null); }}
                >
                  <span style={{ fontSize: 24 }} aria-hidden>{c.icon}</span>
                  <span className="ttl" style={{ fontSize: 14.5 }}>{categoryName(c.id, lang)}</span>
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* ---- which service ---- */}
        {cat ? (
          <Reveal>
            <section className="v-3">
              <h2 className="t-h3">{t('s.pickService')}</h2>
              <div className="h-2 wrap" style={{ gap: 8 }}>
                {servicesOf(cat).map((s) => (
                  <button key={s.id} className={`chip${svc === s.id ? ' on' : ''}`} onClick={() => setSvc(s.id)}>
                    {s.icon} {serviceName(s.id, lang)}
                  </button>
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}

        {/* ---- how many, how long ---- */}
        {svc ? (
          <Reveal>
            <GlassCard className="pad v-4">
              <div>
                <p className="label">{t('g.staffCount')}</p>
                <div className="h-2" style={{ gap: 10 }}>
                  <button className="icon-btn" onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label="-">−</button>
                  <span className="t-h2 t-num grow mid">{count}</span>
                  <button className="icon-btn" onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label="+">+</button>
                </div>
              </div>

              <div>
                <p className="label">{t('g.duration')}</p>
                <div className="grid-3">
                  {(['oneTime', 'daily', 'monthly'] as Duration[]).map((d) => (
                    <button key={d} className={`chip${duration === d ? ' on' : ''}`}
                      style={{ minHeight: 50, justifyContent: 'center', fontSize: 13.5 }}
                      onClick={() => setDuration(d)}>
                      {t(`g.${d}`)}
                    </button>
                  ))}
                </div>
              </div>

              {price ? (
                <div>
                  <p className="t-xs">{t('p.estimate')}</p>
                  <p className="price"><Money amount={price.min} />–<Money amount={price.max} /></p>
                  <p className="t-xs" style={{ marginTop: 4 }}>
                    {count} × {serviceName(svc, lang)} · {t(`g.${duration}`)}
                  </p>
                </div>
              ) : null}

              <p className="note em">👷 {available} · {me.geo.areaName.split(',')[0]}</p>

              <button className="btn" onClick={publish}>{t('p.publish')}</button>
            </GlassCard>
          </Reveal>
        ) : null}
      </main>
      <Dock items={navNormal(t)} />
    </Shell>
  );
}
