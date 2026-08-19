'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { serviceName, categoryName } from '@/lib/i18n-catalog';
import { langNative } from '@/lib/i18n';
import { etaMinutes } from '@/lib/ai/match';
import { suggestPrice } from '@/lib/ai/pricing';
import { distanceKm, formatDistance } from '@/lib/geo';
import { telLink, waLink, waShare, workerShareText, origin } from '@/lib/links';
import { useMe, useStore, useT } from '@/components/store';
import { CardSkeleton, Dock, GlassCard, Reveal, Stagger, StaggerItem } from '@/components/aurora';
import { HeaderTools, Initials, Money, Shell, Stars, TopBar, VerifiedBadge } from '@/components/kit';
import { navNormal } from '@/components/nav';
import { WorkerProfilePanel } from '@/components/panels';

export default function WorkerProfilePage() {
  return (
    <Suspense fallback={<Shell><div className="page" style={{ paddingTop: 90 }}><CardSkeleton /></div></Shell>}>
      <Profile />
    </Suspense>
  );
}

function Profile() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useMe();
  const { t, lang } = useT();

  const w = db.workers.find((x) => x.id === params?.id);
  const svc = search.get('svc') ?? undefined;
  const [price, setPrice] = React.useState<{ min: number; max: number } | null>(null);

  React.useEffect(() => {
    let dead = false;
    (async () => {
      const p = await suggestPrice(svc ?? w?.services[0], 'flexible', 1);
      if (!dead) setPrice({ min: p.min, max: p.max });
    })();
    return () => { dead = true; };
  }, [svc, w?.services]);

  if (!ready) return <Shell><div className="page" style={{ paddingTop: 90 }}><CardSkeleton /></div></Shell>;
  if (!w) return <Shell><TopBar back title="—" /><main className="page"><p className="t-body">{t('e.generic')}</p></main></Shell>;

  const km = distanceKm(me.geo, w.geo);
  const reviews = db.reviews.filter((r) => r.workerId === w.id).sort((a, b) => b.createdAt - a.createdAt);
  const shareText = workerShareText(w, origin(), svc ? serviceName(svc, lang) : categoryName(w.category, lang));

  const hireMessage = `${t('app.name')}: ${t('w.hire')} — ${svc ? serviceName(svc, lang) : categoryName(w.category, lang)}`;

  return (
    <Shell aside={<WorkerProfilePanel worker={w} km={km} />}>
      <TopBar glassy back title={w.name} subtitle={categoryName(w.category, lang)} right={<HeaderTools />} />
      <main className="page v-4" style={{ paddingTop: 4 }}>

        {/* ---------------- identity ---------------- */}
        <Reveal>
          <GlassCard className="pad">
            <div className="h" style={{ gap: 14 }}>
              <Initials name={w.name} size="l" />
              <div className="grow" style={{ minWidth: 0 }}>
                <h1 className="t-h2">{w.name}</h1>
                <div style={{ marginTop: 6 }}>
                  {w.reviewCount
                    ? <Stars value={w.rating} count={w.reviewCount} />
                    : <span className="t-xs">{t('w.noReviews')}</span>}
                </div>
                <div className="h-2 wrap" style={{ gap: 7, marginTop: 10 }}>
                  <VerifiedBadge v={w.verification} />
                </div>
              </div>
            </div>

            {/* the four facts a customer actually decides on */}
            <div className="grid-2" style={{ marginTop: 16, gap: 10 }}>
              <div className="stat"><div className="n t-num">{w.jobsCompleted}</div><div className="l">{t('w.jobsDone')}</div></div>
              <div className="stat"><div className="n t-num">{w.experienceYears ?? '—'}</div><div className="l">{t('w.experience')} ({t('c.years')})</div></div>
              <div className="stat"><div className="n t-num">{formatDistance(km, t('c.nearby'))}</div><div className="l">{t('w.away')}</div></div>
              <div className="stat"><div className="n t-num">{w.responseMins} {t('c.min')}</div><div className="l">{t('w.respondsIn')}</div></div>
            </div>
          </GlassCard>
        </Reveal>

        {/* ---------------- contact row ---------------- */}
        <Reveal delay={0.04}>
          <div className="h-2" style={{ gap: 9 }}>
            <a className="btn ghost md grow" href={telLink(w.phone)}>📞 {t('w.callNow')}</a>
            <a className="btn ghost md grow" href={waLink(w.phone, hireMessage)} target="_blank" rel="noopener noreferrer">
              💬 {t('w.whatsapp')}
            </a>
            <a className="btn ghost md" href={waShare(shareText)} target="_blank" rel="noopener noreferrer" aria-label={t('w.share')}>
              ↗
            </a>
          </div>
        </Reveal>

        {/* ---------------- about ---------------- */}
        <Reveal delay={0.04}>
          <GlassCard className="flat pad">
            <p className="t-micro">{t('w.about')}</p>
            <p className="t-body" style={{ color: 'var(--ink)', marginTop: 8 }}>{w.bio}</p>
            <p className="t-xs" style={{ marginTop: 12 }}>🎙️ &ldquo;{w.rawSpeech}&rdquo;</p>
          </GlassCard>
        </Reveal>

        {/* ---------------- services + languages ---------------- */}
        <Reveal delay={0.04}>
          <GlassCard className="flat pad v-4">
            <div>
              <p className="t-micro" style={{ marginBottom: 9 }}>{t('w.services')}</p>
              <div className="h-2 wrap" style={{ gap: 8 }}>
                {w.services.map((s) => (
                  <span key={s} className={`tag${s === svc ? ' em' : ''}`}>{serviceName(s, lang)}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="t-micro" style={{ marginBottom: 9 }}>{t('w.speaks')}</p>
              <div className="h-2 wrap" style={{ gap: 8 }}>
                {w.languages.map((l) => <span key={l} className="tag in">{langNative(l)}</span>)}
              </div>
            </div>
            <div>
              <p className="t-micro" style={{ marginBottom: 9 }}>{t('w.availability')}</p>
              <span className="tag">{t(`av.${w.availability}` as any)}</span>
            </div>
          </GlassCard>
        </Reveal>

        {/* ---------------- reviews ---------------- */}
        <section className="v-3">
          <h2 className="t-h3">{t('w.reviews')} {w.reviewCount ? `(${w.reviewCount})` : ''}</h2>
          {reviews.length === 0 ? (
            <GlassCard className="flat pad-s"><p className="t-sm">{t('w.noReviews')}</p></GlassCard>
          ) : (
            <Stagger className="v-3" gap={0.05}>
              {reviews.map((r) => (
                <StaggerItem key={r.id}>
                  <GlassCard className="flat pad-s">
                    <div className="between">
                      <span className="t-sm strong">{r.authorName}</span>
                      <Stars value={r.stars} />
                    </div>
                    <p className="t-sm" style={{ marginTop: 8, color: 'var(--ink)' }}>&ldquo;{r.text}&rdquo;</p>
                    {r.tags.length ? (
                      <div className="h-2 wrap" style={{ gap: 6, marginTop: 10 }}>
                        {r.tags.map((tag) => <span key={tag} className="tag em" style={{ fontSize: 11.5 }}>{t(`r.${tag}` as any)}</span>)}
                      </div>
                    ) : null}
                  </GlassCard>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
      </main>

      {/* ---------------- sticky hire bar ---------------- */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45,
        maxWidth: 520, margin: '0 auto', padding: '12px 18px calc(96px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(180deg, transparent, var(--canvas) 38%)',
      }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <span className="t-xs">{t('p.estimate')}</span>
          {price ? <span className="t-sm strong t-num"><Money amount={price.min} />–<Money amount={price.max} /></span> : null}
        </div>
        <button className="btn" onClick={() => router.push(`/book?worker=${w.id}${svc ? `&svc=${svc}&cat=${w.category}` : ''}`)}>
          {t('b.request')} →
        </button>
      </div>

      <Dock items={navNormal(t)} />
    </Shell>
  );
}
