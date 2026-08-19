'use client';

import React from 'react';
import Link from 'next/link';
import type { Job, Worker } from '@/lib/types';
import { useMe, useStore, useT } from './store';
import { Money, Panel, Stars } from './kit';

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
