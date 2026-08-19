'use client';

import React from 'react';
import Link from 'next/link';
import type { Job, Worker } from '@/lib/types';
import { etaMinutes } from '@/lib/ai/match';
import { formatDistance } from '@/lib/geo';
import { amountFor, statusKey } from '@/lib/payments';
import { telLink, waLink, navigateLink } from '@/lib/links';
import { hoursPerWeek, monthlyCost, shiftSummary } from '@/lib/shifts';
import type { ShiftPattern } from '@/lib/shifts';
import { useMe, useStore, useT } from './store';
import { Initials, Money, Panel, Stars, VerifiedBadge } from './kit';

/* ===========================================================================
   DESKTOP CONTEXT PANELS
   ---------------------------------------------------------------------------
   The right-hand column of the three-panel deck. Everything here is context:
   totals, status, shortcuts. It is rendered only above 1024px (see Shell), so
   nothing in this file may be the ONLY way to reach a feature — the phone has
   to work without it.
   =========================================================================== */

const DEAD = ['completed', 'cancelled_by_client', 'cancelled_by_worker', 'expired'];
const DAY = 86_400_000;

function money(j: Job) { return j.agreedAmount ?? Math.round((j.priceMin + j.priceMax) / 2); }

/** One number and its label. The number is the point, so it leads. */
export function StatRow({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="between" style={{ alignItems: 'baseline' }}>
      <span className="t-xs">{label}</span>
      <span style={{ textAlign: 'right' }}>
        <b className="t-sm strong t-num">{value}</b>
        {hint ? <><br /><span className="t-micro">{hint}</span></> : null}
      </span>
    </div>
  );
}

/* ------------------------------------------------------- customer / society */

export function ClientPanel() {
  const { db } = useStore();
  const me = useMe();
  const { t } = useT();

  const mine = db.jobs.filter((j) => j.clientId === me.id);
  const live = mine.filter((j) => !DEAD.includes(j.status));
  const done = mine.filter((j) => j.status === 'completed');

  const monthAgo = Date.now() - 30 * DAY;
  const spent = done
    .filter((j) => (j.completedAt ?? j.createdAt) > monthAgo)
    .reduce((sum, j) => sum + money(j), 0);

  const hired = new Set(done.map((j) => j.assignedWorkerId).filter(Boolean)).size;

  return (
    <>
      <Panel title={t('d.glance')} icon="📊">
        <StatRow label={t('d.active')} value={live.length} />
        <StatRow label={t('d.thisMonth')} value={<Money amount={spent} />} />
        <StatRow label={t('d.hired')} value={hired} />
      </Panel>

      <Panel title={t('d.quick')} icon="⚡">
        <div className="v-2">
          <Link href="/book" className="btn sm">➕ {t('b.request')}</Link>
          <Link href="/search" className="btn sm ghost">🔎 {t('x.browseAll')}</Link>
        </div>
      </Panel>

      <HelpPanel />
    </>
  );
}

/* ------------------------------------------------------------------ worker */

export function WorkerPanel({ worker }: { worker: Worker }) {
  const { db } = useStore();
  const { t } = useT();

  const mine = db.jobs.filter((j) => j.assignedWorkerId === worker.id);
  const done = mine.filter((j) => j.status === 'completed');
  const now = Date.now();

  const earned = (since: number) =>
    done.filter((j) => (j.completedAt ?? j.createdAt) > since).reduce((s, j) => s + money(j), 0);

  const open = db.jobs.filter((j) => j.status === 'requested').length;

  /* What is still missing from this profile, most valuable first. */
  const todo: { icon: string; text: string; href: string }[] = [];
  if (worker.verification.status !== 'verified') todo.push({ icon: '🪪', text: t('x.tipVerify'), href: '/verify' });
  if (worker.services.length < 3) todo.push({ icon: '🧰', text: t('x.tipSkills'), href: '/me' });
  if (worker.radiusKm < 8) todo.push({ icon: '📍', text: t('x.tipRadius'), href: '/me' });

  const strength = Math.round(((3 - todo.length) / 3) * 100);

  return (
    <>
      <Panel title={t('d.earnings')} icon="💰">
        <StatRow label={t('d.today')} value={<Money amount={earned(now - DAY)} />} />
        <StatRow label={t('d.thisWeek')} value={<Money amount={earned(now - 7 * DAY)} />} />
        <StatRow label={t('d.thisMonth')} value={<Money amount={earned(now - 30 * DAY)} />} />
        <hr className="rule" />
        <StatRow label={t('d.finished')} value={worker.jobsCompleted} />
        <div className="between">
          <span className="t-xs">{t('w.reviews')}</span>
          <Stars value={worker.rating} count={worker.reviewCount} />
        </div>
        <Link href="/earnings" className="btn sm ghost">📊 {t('e.title')} →</Link>
      </Panel>

      <Panel title={t('d.strength')} icon="📈">
        <div className="meter" aria-label={`${strength}%`}><i style={{ width: `${strength}%` }} /></div>
        <p className="t-micro">{strength}%</p>
        {todo.length ? (
          <div className="tips" style={{ marginTop: 4 }}>
            {todo.map((it) => (
              <Link key={it.text} href={it.href} className="tip">
                <span className="ic" aria-hidden>{it.icon}</span>
                <span className="tx">{it.text}</span>
                <span className="go" aria-hidden>›</span>
              </Link>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel title={t('d.nearby')} icon="📍">
        <StatRow label={t('h.myJobs')} value={open} />
        <StatRow label={t('d.visibleTo')} value={`${worker.radiusKm} ${t('c.km')}`} />
      </Panel>

      <HelpPanel />
    </>
  );
}

/* -------------------------------------------------------------------- help */

export function HelpPanel() {
  const { t } = useT();
  return (
    <Panel title={t('d.help')} icon="🛟">
      <p className="t-xs">{t('d.helpSub')}</p>
      <Link href="/trust" className="btn sm ghost">🛡️ {t('d.openTrust')}</Link>
    </Panel>
  );
}

/* ------------------------------------------------------------- job detail */

/**
 * Context for one job: money, distance, and the two buttons a person reaches
 * for when something is going wrong. On a phone all of this already exists in
 * the main column — this panel saves a scroll on a laptop, it does not hold
 * anything exclusively.
 */
export function JobPanel({ job, worker, km }: { job: Job; worker: Worker | null; km: number }) {
  const { t } = useT();
  const live = job.status === 'on_the_way' || job.status === 'working';

  return (
    <>
      <Panel title={t('d.thisJob')} icon="📋">
        <StatRow label={t('y.agreed')} value={<Money amount={amountFor(job)} />} />
        <StatRow label={t('c.done')} value={t(statusKey(job.payment.status) as any)} />
        {worker ? <StatRow label={t('w.away')} value={formatDistance(km, t('c.nearby'))} hint={`~${etaMinutes(km)} ${t('c.min')}`} /> : null}
      </Panel>

      {job.shift ? (
        <Panel title={t('sh.shiftPlan')} icon="🔁">
          <p className="t-xs">{shiftSummary(job.shift, t)}</p>
          <StatRow label={t('sh.hoursWeek')} value={hoursPerWeek(job.shift)} />
        </Panel>
      ) : null}

      {worker ? (
        <Panel title={t('d.workerAt')} icon="👷">
          <div className="h-2" style={{ gap: 10 }}>
            <Initials name={worker.name} size="s" />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="t-sm strong">{worker.name}</div>
              {worker.reviewCount ? <Stars value={worker.rating} count={worker.reviewCount} /> : null}
            </div>
          </div>
          <VerifiedBadge v={worker.verification} small />
          <div className="v-2">
            <a className="btn sm ghost" href={telLink(worker.phone)}>📞 {t('w.callNow')}</a>
            <a className="btn sm ghost" href={waLink(worker.phone, job.title)} target="_blank" rel="noopener noreferrer">💬 {t('w.whatsapp')}</a>
          </div>
        </Panel>
      ) : null}

      <Panel title={t('d.safety')} icon="🛡️">
        {live ? <a href="tel:112" className="btn sm" style={{ background: 'var(--danger)' }}>🆘 112</a> : null}
        <a className="btn sm ghost" href={navigateLink(job.geo)} target="_blank" rel="noopener noreferrer">🧭 {t('j.openMaps')}</a>
        <Link href="/trust" className="btn sm quiet">{t('ts.title')} →</Link>
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------- search results */

export function SearchPanel({
  count, areaName, price, filters, filter, onFilter,
}: {
  count: number;
  areaName: string;
  price: { min: number; max: number } | null;
  filters: readonly { id: string; label: string }[];
  filter: string;
  onFilter: (id: string) => void;
}) {
  const { t } = useT();
  return (
    <>
      <Panel title={t('d.narrow')} icon="🎚️">
        <div className="v-2">
          {filters.map((f) => (
            <button key={f.id} className={`chip${filter === f.id ? ' on' : ''}`}
              style={{ justifyContent: 'flex-start', minHeight: 44 }}
              onClick={() => onFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={t('d.foundIn')} icon="📍">
        <StatRow label={areaName} value={count} />
        {price ? (
          <StatRow label={t('d.priceGuide')} value={<><Money amount={price.min} />–<Money amount={price.max} /></>} />
        ) : null}
      </Panel>

      <HelpPanel />
    </>
  );
}

/* --------------------------------------------------------- worker profile */

export function WorkerProfilePanel({ worker, km }: { worker: Worker; km: number }) {
  const { db } = useStore();
  const { t } = useT();
  const reviews = db.reviews.filter((r) => r.workerId === worker.id);

  return (
    <>
      <Panel title={t('d.workerAt')} icon="👷">
        <VerifiedBadge v={worker.verification} small />
        <StatRow label={t('w.jobsDone')} value={worker.jobsCompleted} />
        <StatRow label={t('w.experience')} value={worker.experienceYears ?? '—'} />
        <StatRow label={t('w.away')} value={formatDistance(km, t('c.nearby'))} hint={`~${etaMinutes(km)} ${t('c.min')}`} />
        <StatRow label={t('w.respondsIn')} value={`${worker.responseMins} ${t('c.min')}`} />
      </Panel>

      <Panel title={t('w.reviews')} icon="⭐">
        {worker.reviewCount
          ? <Stars value={worker.rating} count={worker.reviewCount} />
          : <p className="t-xs">{t('w.noReviews')}</p>}
        {reviews.slice(0, 2).map((r) => (
          <p key={r.id} className="t-xs" style={{ borderTop: '1px solid var(--hairline-2)', paddingTop: 8 }}>
            &ldquo;{r.text}&rdquo;
          </p>
        ))}
      </Panel>

      <HelpPanel />
    </>
  );
}

/* ------------------------------------------------------------ bulk hiring */

export function HirePanel({
  shift, staff, hourly, workersNearby,
}: { shift: ShiftPattern | null; staff: number; hourly: number; workersNearby: number }) {
  const { t } = useT();
  return (
    <>
      {shift ? (
        <Panel title={t('sh.shiftPlan')} icon="🔁">
          <p className="t-xs">{shiftSummary(shift, t)}</p>
          <hr className="rule" />
          <StatRow label={t('sh.hoursWeek')} value={hoursPerWeek(shift) * staff} />
          <StatRow label={t('sh.perMonth')} value={<Money amount={monthlyCost(shift, hourly, staff)} />} />
        </Panel>
      ) : null}

      <Panel title={t('d.nearby')} icon="👷">
        <StatRow label={t('s.fAvailable')} value={workersNearby} />
      </Panel>

      <HelpPanel />
    </>
  );
}
