'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseJobRequest } from '@/lib/ai/jobs';
import { suggestPrice } from '@/lib/ai/pricing';
import { rankWorkers, type MatchResult } from '@/lib/ai/matching';
import { categoryById, CATEGORIES } from '@/lib/ai/taxonomy';
import { distanceKm, formatKm } from '@/lib/geo';
import { etaMinutes, tierOf, tierProgress, tierGap, endorsementsFor, streakDays } from '@/lib/tiers';
import type { CategoryId, Job, Worker } from '@/lib/types';
import { useActions, useCurrentResident, useStore, useT } from '@/components/store';
import { ThemeToggle } from '@/components/theme';
import {
  CardSkeleton, Dock, GlassCard, Meter, Reveal, Ring, SPRING, Sheet, Stagger, StaggerItem, TierBadge,
} from '@/components/aurora';
import { motion, useReducedMotion } from 'motion/react';

type SortId = 'match' | 'near' | 'now' | 'cheap';

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="page v-3" style={{ paddingTop: 80 }}><CardSkeleton /><CardSkeleton /></div></div>}>
      <Discover />
    </Suspense>
  );
}

function Discover() {
  const params = useSearchParams();
  const router = useRouter();
  const { db } = useStore();
  const me = useCurrentResident();
  const { t } = useT();
  const reduce = useReducedMotion();

  const q = params.get('q') ?? '';
  const catParam = params.get('cat') as CategoryId | null;

  const [sort, setSort] = React.useState<SortId>('match');
  const [category, setCategory] = React.useState<CategoryId>(catParam ?? 'electrician');
  const [title, setTitle] = React.useState(q || 'Workers near you');
  const [price, setPrice] = React.useState<{ min: number; max: number } | null>(null);
  const [busy, setBusy] = React.useState(!!q);
  const [open, setOpen] = React.useState<Worker | null>(null);

  const here = me?.geo ?? db.residents[0]?.geo ?? db.workers[0].geo;

  /* A free-text query is parsed by the same AI layer the posting flow uses,
     so browsing and posting can never disagree about what a request means. */
  React.useEffect(() => {
    let dead = false;
    (async () => {
      if (!q) {
        const p = await suggestPrice(category, 'flexible', 1);
        if (!dead) setPrice({ min: p.min, max: p.max });
        return;
      }
      setBusy(true);
      const parsed = await parseJobRequest(q);
      const p = await suggestPrice(parsed.category, parsed.urgency, parsed.estimatedHours);
      if (dead) return;
      setCategory(parsed.category);
      setTitle(q);
      setPrice({ min: p.min, max: p.max });
      setBusy(false);
    })();
    return () => { dead = true; };
  }, [q, category]);

  /* A synthetic job so the ranking engine is literally the same code path
     used when a real job is posted. */
  const probe: Job = React.useMemo(() => ({
    id: 'probe', residentId: me?.id ?? 'anon', title, rawRequest: q || title,
    lang: 'en', category, skills: [], urgency: 'flexible', estimatedHours: 1,
    geo: here, priceMin: price?.min ?? 0, priceMax: price?.max ?? 0,
    priceBasis: '', status: 'open', createdAt: 0,
  }), [me?.id, title, q, category, here, price]);

  const results = React.useMemo(() => {
    const ranked = rankWorkers(probe, db.workers);
    const withKm = ranked.map((r) => ({ ...r, km: distanceKm(here, r.worker.geo) }));
    switch (sort) {
      case 'near':  return [...withKm].sort((a, b) => a.km - b.km);
      case 'now':   return withKm.filter((r) => r.worker.availability === 'anytime');
      case 'cheap': return [...withKm].sort((a, b) => a.worker.experienceYears - b.worker.experienceYears);
      default:      return withKm;
    }
  }, [probe, db.workers, sort, here]);

  const SORTS: { id: SortId; label: string }[] = [
    { id: 'match', label: '✨ Best match' },
    { id: 'near',  label: '📍 Nearest' },
    { id: 'now',   label: '⚡ Available now' },
    { id: 'cheap', label: '💰 Best value' },
  ];

  return (
    <div className="shell">
      <header className="topbar glassy">
        <button className="icon-btn" onClick={() => router.push('/')} aria-label={t('c.back')}>←</button>
        <div className="grow" style={{ minWidth: 0 }}>
          <h1 className="t-h3" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {categoryById(category).icon} {t(`cat.${category}` as any)}
          </h1>
          <p className="t-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {results.length} near {here.areaName.split(',')[0]}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="page v-4" style={{ paddingTop: 4 }}>

        <div className="scroll-x">
          {SORTS.map((s) => (
            <button key={s.id} className={`chip${sort === s.id ? ' on' : ''}`} onClick={() => setSort(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {!q ? (
          <div className="scroll-x">
            {CATEGORIES.filter((c) => c.id !== 'other').map((c) => (
              <button
                key={c.id}
                className={`chip${category === c.id ? ' on' : ''}`}
                onClick={() => setCategory(c.id as CategoryId)}
              >
                {c.icon} {t(`cat.${c.id}` as any)}
              </button>
            ))}
          </div>
        ) : (
          <GlassCard className="flat pad-s">
            <p className="t-xs">You asked for</p>
            <p className="t-sm strong">&ldquo;{q}&rdquo;</p>
          </GlassCard>
        )}

        {busy ? (
          <><CardSkeleton /><CardSkeleton /></>
        ) : results.length === 0 ? (
          <div className="empty"><span className="big">🔎</span>No one free right now. Try another filter.</div>
        ) : (
          <Stagger className="v-4" gap={0.07}>
            {results.slice(0, 8).map((m, i) => (
              <StaggerItem key={m.worker.id}>
                <WorkerCard
                  m={m as MatchResult & { km: number }}
                  top={i === 0 && sort === 'match'}
                  price={price}
                  onOpen={() => setOpen(m.worker)}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </main>

      <Dock items={[
        { href: '/', icon: '🏠', label: 'Home' },
        { href: '/discover', icon: '🔎', label: 'Find' },
        { href: '/leaderboard', icon: '🏆', label: 'Ranks' },
        { href: '/resident', icon: '👤', label: 'You' },
      ]} />

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        {open ? <WorkerDetail w={open} here={here} onHire={() => { setOpen(null); router.push('/resident/new'); }} /> : null}
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------- worker card */

function Stars({ v }: { v: number }) {
  const full = Math.round(v);
  return (
    <span aria-label={`${v.toFixed(1)} out of 5`} style={{ color: 'var(--gd-500)', fontWeight: 700, letterSpacing: 1 }}>
      {'★'.repeat(full)}<span style={{ opacity: 0.28 }}>{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function WorkerCard({
  m, top, price, onOpen,
}: {
  m: MatchResult & { km: number }; top?: boolean;
  price: { min: number; max: number } | null; onOpen: () => void;
}) {
  const { t } = useT();
  const w = m.worker;
  const tier = tierOf(w);
  const eta = etaMinutes(m.km);
  const live = w.availability === 'anytime';

  return (
    <GlassCard interactive sheen={top} className="pad" glow={top ? 'em' : undefined} as="article">
      {top ? (
        <div className="ribbon">
          ✨ Top match
          <span className="sp">{m.score}% fit for this job</span>
        </div>
      ) : null}

      <div className="h" style={{ gap: 13, marginBottom: 13 }}>
        <div className={`av m${tier.id === 'gold' ? ' gd' : tier.id === 'silver' ? ' in' : ''}`}>
          {w.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          {w.trust.reviewCount >= 5 ? <span className="verified" title="Verified">✓</span> : null}
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <h3 className="t-h3" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</h3>
          <div className="h-2" style={{ marginTop: 4, gap: 7 }}>
            {w.trust.reviewCount ? (
              <>
                <Stars v={w.trust.overall} />
                <span className="t-xs"><b className="strong">{w.trust.overall.toFixed(1)}</b> · {w.jobsDone} jobs</span>
              </>
            ) : (
              <span className="t-xs">✨ {t('trust.new')}</span>
            )}
          </div>
        </div>
        <Ring value={m.score} size="m" />
      </div>

      <div className="h-2 wrap" style={{ gap: 7, marginBottom: 12 }}>
        <TierBadge tier={tier} />
        {live
          ? <span className="tag em"><span className="live-dot" />Available now</span>
          : <span className="tag gd">{t(`ob.avail.${w.availability}` as any)}</span>}
      </div>

      <div className="h-2 wrap" style={{ gap: 7 }}>
        {w.skills.slice(0, 3).map((s) => <span key={s} className="tag">{s}</span>)}
      </div>

      <hr className="rule" style={{ margin: '14px 0' }} />

      <div className="between">
        <div className="h-2" style={{ gap: 16 }}>
          <div>
            <div className="t-xs">Distance</div>
            <div className="t-sm strong t-num">{formatKm(m.km)}</div>
          </div>
          <div>
            <div className="t-xs">Arrives in</div>
            <div className="t-sm strong t-num">~{eta} min</div>
          </div>
        </div>
        {price ? (
          <div style={{ textAlign: 'right' }}>
            <div className="t-xs">Fair price</div>
            <div className="t-sm strong t-num">₹{price.min}–₹{price.max}</div>
          </div>
        ) : null}
      </div>

      <div className="h-2" style={{ marginTop: 14, gap: 9 }}>
        <button className="btn ghost md grow" onClick={onOpen}>Profile</button>
        <button className="btn md grow" onClick={onOpen}>Hire</button>
      </div>

      {m.reasons.length ? (
        <p className="t-xs" style={{ marginTop: 11 }}>✨ {m.reasons.join(' · ')}</p>
      ) : null}
    </GlassCard>
  );
}

/* ------------------------------------------------ profile sheet / dashboard */

function WorkerDetail({ w, here, onHire }: { w: Worker; here: any; onHire: () => void }) {
  const { t } = useT();
  const tier = tierOf(w);
  const gap = tierGap(w);
  const pct = tierProgress(w);
  const marks = endorsementsFor(w);
  const km = distanceKm(here, w.geo);
  const reduce = useReducedMotion();

  return (
    <div className="v-4">
      <div className="h" style={{ gap: 14 }}>
        <div className="av l">{w.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          {w.trust.reviewCount >= 5 ? <span className="verified">✓</span> : null}
        </div>
        <div className="grow">
          <TierBadge tier={tier} />
          <p className="t-sm" style={{ marginTop: 8 }}>
            {categoryById(w.category).icon} {t(`cat.${w.category}` as any)} · {w.experienceYears} {t('c.years')}
          </p>
          <p className="t-xs">📍 {formatKm(km)} · ~{etaMinutes(km)} min away</p>
        </div>
      </div>

      {/* reputation dashboard */}
      <GlassCard className="flat pad">
        <div className="between" style={{ marginBottom: 14 }}>
          <p className="t-micro">Reputation</p>
          <Ring value={pct} size="s" tone="gd" label="progress to next tier" />
        </div>
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div className="stat"><div className="n t-num">{w.jobsDone}</div><div className="l">Jobs</div></div>
          <div className="stat"><div className="n t-num">{w.trust.overall.toFixed(1)}</div><div className="l">Rating</div></div>
          <div className="stat"><div className="n t-num">{streakDays([Date.now(), Date.now() - 86400000, Date.now() - 2 * 86400000])}</div><div className="l">Day streak</div></div>
        </div>
        {w.trust.reviewCount ? (
          <div className="v-3">
            {([
              [t('trust.reliability'), w.trust.reliability],
              [t('trust.skill'), w.trust.skillQuality],
              [t('trust.prof'), w.trust.professionalism],
            ] as [string, number][]).map(([label, v]) => (
              <div key={label}>
                <div className="between" style={{ marginBottom: 4 }}>
                  <span className="t-xs">{label}</span>
                  <span className="t-xs strong">{v.toFixed(1)}</span>
                </div>
                <Meter value={(v / 5) * 100} />
              </div>
            ))}
          </div>
        ) : <p className="t-xs">No reviews yet — be the first to hire.</p>}
        {gap ? <p className="note em" style={{ marginTop: 14 }}>🏅 {gap}</p> : null}
      </GlassCard>

      {marks.length ? (
        <div>
          <p className="t-micro" style={{ marginBottom: 9 }}>Earned badges</p>
          <div className="h-2 wrap" style={{ gap: 8 }}>
            {marks.map((e, i) => (
              <motion.span
                key={e.id}
                className="tag em"
                initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...SPRING.bouncy, delay: i * 0.05 }}
              >
                {e.icon} {e.label}
              </motion.span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="t-micro" style={{ marginBottom: 9 }}>Skills</p>
        <div className="h-2 wrap" style={{ gap: 8 }}>
          {w.skills.map((s) => <span key={s} className="tag">{s}</span>)}
        </div>
      </div>

      <GlassCard className="flat pad-s">
        <p className="t-xs">🎙️ In their own words</p>
        <p className="t-sm" style={{ marginTop: 6, color: 'var(--ink)' }}>&ldquo;{w.rawSpeech}&rdquo;</p>
      </GlassCard>

      <button className="btn" onClick={onHire}>Hire {w.name.split(' ')[0]} →</button>
    </div>
  );
}
