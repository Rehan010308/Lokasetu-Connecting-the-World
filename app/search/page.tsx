'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CATEGORIES, servicesOf, type CategoryId } from '@/lib/catalog';
import { categoryName, serviceName } from '@/lib/i18n-catalog';
import { rankWorkers, etaMinutes } from '@/lib/ai/match';
import { suggestPrice } from '@/lib/ai/pricing';
import { formatKm } from '@/lib/geo';
import { useMe, useStore, useT } from '@/components/store';
import { CardSkeleton, Dock, GlassCard, Reveal, Stagger, StaggerItem } from '@/components/aurora';
import { Empty, HeaderTools, Initials, Money, Shell, Stars, TopBar, VerifiedBadge } from '@/components/kit';
import { navNormal } from '@/components/nav';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <Shell><div className="page v-3" style={{ paddingTop: 90 }}><CardSkeleton /><CardSkeleton /></div></Shell>
    }>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const { db } = useStore();
  const me = useMe();
  const { t, lang } = useT();

  const cat = params.get('cat') as CategoryId | null;
  const svc = params.get('svc');
  const [filter, setFilter] = React.useState<'all' | 'near' | 'now' | 'verified'>('all');
  const [price, setPrice] = React.useState<{ min: number; max: number } | null>(null);

  React.useEffect(() => {
    let dead = false;
    (async () => {
      if (!svc) { setPrice(null); return; }
      const p = await suggestPrice(svc, 'flexible', 1);
      if (!dead) setPrice({ min: p.min, max: p.max });
    })();
    return () => { dead = true; };
  }, [svc]);

  /* ------------------------------ level 1: categories ------------------------------ */
  if (!cat) {
    return (
      <Shell>
        <TopBar glassy title={t('h.browse')} back="/" right={<HeaderTools />} />
        <main className="page">
          <Stagger className="grid-2" gap={0.04}>
            {CATEGORIES.map((c) => (
              <StaggerItem key={c.id}>
                <Link href={`/search?cat=${c.id}`} style={{ display: 'block' }}>
                  <GlassCard interactive className="pad-s mid" style={{ minHeight: 108 }}>
                    <div style={{ fontSize: 30 }} aria-hidden>{c.icon}</div>
                    <div className="t-sm strong" style={{ marginTop: 8, lineHeight: 1.25 }}>
                      {categoryName(c.id, lang)}
                    </div>
                  </GlassCard>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </main>
        <Dock items={navNormal(t)} />
      </Shell>
    );
  }

  /* --------------------------- level 2: services in category --------------------------- */
  if (!svc) {
    return (
      <Shell>
        <TopBar glassy title={categoryName(cat, lang)} subtitle={t('s.pickService')} back="/search" right={<HeaderTools />} />
        <main className="page">
          <Stagger className="v-3" gap={0.05}>
            {servicesOf(cat).map((s) => {
              const n = db.workers.filter((w) => w.services.includes(s.id)).length;
              return (
                <StaggerItem key={s.id}>
                  <Link href={`/search?cat=${cat}&svc=${s.id}`} className="choice" style={{ minHeight: 68 }}>
                    <span className="lead" aria-hidden>{s.icon}</span>
                    <span>
                      <span className="ttl">{serviceName(s.id, lang)}</span><br />
                      <span className="sub">{n}</span>
                    </span>
                    <span className="mark" aria-hidden>›</span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </main>
        <Dock items={navNormal(t)} />
      </Shell>
    );
  }

  /* ------------------- level 3: only workers who do this exact service ------------------- */
  const results = rankWorkers(
    { geo: me.geo, category: cat, serviceId: svc },
    db.workers,
    { verifiedOnly: filter === 'verified', availableNow: filter === 'now' }
  );
  const shown = filter === 'near' ? [...results].sort((a, b) => a.km - b.km) : results;

  const FILTERS = [
    { id: 'all', label: t('s.fAll') },
    { id: 'near', label: `📍 ${t('s.fNear')}` },
    { id: 'now', label: `⚡ ${t('s.fAvailable')}` },
    { id: 'verified', label: `✅ ${t('s.fVerified')}` },
  ] as const;

  return (
    <Shell>
      <TopBar
        glassy
        title={serviceName(svc, lang)}
        subtitle={`${shown.length} · ${me.geo.areaName.split(',')[0]}`}
        back={`/search?cat=${cat}`}
        right={<HeaderTools />}
      />
      <main className="page v-4">
        <div className="scroll-x">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id as any)}>
              {f.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? <Empty text={t('s.none')} /> : (
          <Stagger className="v-4" gap={0.06}>
            {shown.map((m) => (
              <StaggerItem key={m.worker.id}>
                <Link href={`/worker/${m.worker.id}?svc=${svc}`} style={{ display: 'block' }}>
                  <GlassCard interactive className="pad" as="article">
                    <div className="h" style={{ gap: 13 }}>
                      <Initials name={m.worker.name} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <h3 className="t-h3" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.worker.name}
                        </h3>
                        <div style={{ marginTop: 4 }}>
                          {m.worker.reviewCount
                            ? <Stars value={m.worker.rating} count={m.worker.reviewCount} />
                            : <span className="t-xs">{t('w.noReviews')}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="h-2 wrap" style={{ gap: 7, marginTop: 12 }}>
                      <VerifiedBadge v={m.worker.verification} />
                      {m.worker.availability === 'anytime'
                        ? <span className="tag em"><span className="live-dot" />{t('s.fAvailable')}</span>
                        : <span className="tag">{t(`av.${m.worker.availability}` as any)}</span>}
                    </div>

                    <hr className="rule" style={{ margin: '14px 0' }} />

                    <div className="between">
                      <div className="h-2" style={{ gap: 16 }}>
                        <div>
                          <div className="t-xs">{t('w.away')}</div>
                          <div className="t-sm strong t-num">{formatKm(m.km)}</div>
                        </div>
                        <div>
                          <div className="t-xs">{t('j.eta')}</div>
                          <div className="t-sm strong t-num">~{etaMinutes(m.km)} {t('c.min')}</div>
                        </div>
                        <div>
                          <div className="t-xs">{t('w.jobsDone')}</div>
                          <div className="t-sm strong t-num">{m.worker.jobsCompleted}</div>
                        </div>
                      </div>
                      {price ? (
                        <div style={{ textAlign: 'right' }}>
                          <div className="t-xs">{t('p.estimate')}</div>
                          <div className="t-sm strong t-num"><Money amount={price.min} />–<Money amount={price.max} /></div>
                        </div>
                      ) : null}
                    </div>
                  </GlassCard>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </main>
      <Dock items={navNormal(t)} />
    </Shell>
  );
}
