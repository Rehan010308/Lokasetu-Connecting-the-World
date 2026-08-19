'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { serviceName } from '@/lib/i18n-catalog';
import { useMe, useStore, useT } from '@/components/store';
import { Dock, GlassCard, PullToRefresh, Stagger, StaggerItem } from '@/components/aurora';
import { Empty, HeaderTools, Money, Shell, TopBar } from '@/components/kit';
import { navNormal, navWorker } from '@/components/nav';
import { ClientPanel, WorkerPanel } from '@/components/panels';

export default function JobsPage() {
  const router = useRouter();
  const { db, ready, refresh } = useStore();
  const me = useMe();
  const { t, lang } = useT();

  React.useEffect(() => { if (ready && !me.role) router.replace('/login'); }, [ready, me.role, router]);
  if (!ready || !me.role) return <Shell><main className="page" style={{ paddingTop: 100 }}><Empty icon="⏳" text={t('c.loading')} /></main></Shell>;

  const isWorker = me.role === 'worker';
  const list = isWorker
    ? db.jobs.filter((j) => j.assignedWorkerId === me.id)
    : db.jobs.filter((j) => j.clientId === me.id);

  const DEAD = ['completed', 'cancelled_by_client', 'cancelled_by_worker', 'expired'];
  const live = list.filter((j) => !DEAD.includes(j.status));
  const past = list.filter((j) => DEAD.includes(j.status));

  return (
    <Shell aside={isWorker && me.worker ? <WorkerPanel worker={me.worker} /> : <ClientPanel />}>
      <TopBar glassy title={t('n.jobs')} right={<HeaderTools />} />
      <PullToRefresh onRefresh={refresh}>
      <main className="page v-4" style={{ paddingTop: 4 }}>
        {list.length === 0 ? (
          isWorker ? (
            <Empty
              icon="🧰"
              title={t('x.noFeedTitle')}
              text={t('x.noFeedBody')}
              action={{ href: '/', label: `🔎 ${t('n.home')}` }}
            />
          ) : (
            <Empty
              icon="📋"
              title={t('x.noReqTitle')}
              text={t('x.noReqBody')}
              action={{ href: '/book', label: `➕ ${t('b.request')}` }}
              tips={[
                { icon: '🔎', text: t('x.browseAll'), href: '/search' },
                { icon: '🛡️', text: t('ts.title'), href: '/trust' },
              ]}
            />
          )
        ) : null}

        {live.length ? (
          <Stagger className="v-3 grid-cards" gap={0.05}>
            {live.map((j) => <StaggerItem key={j.id}><JobRow job={j} lang={lang} t={t} db={db} /></StaggerItem>)}
          </Stagger>
        ) : null}

        {past.length ? (
          <>
            <hr className="rule" style={{ margin: '8px 0' }} />
            <p className="t-micro">{t('j.completed')}</p>
            <Stagger className="v-3 grid-cards" gap={0.04}>
              {past.map((j) => <StaggerItem key={j.id}><JobRow job={j} lang={lang} t={t} db={db} /></StaggerItem>)}
            </Stagger>
          </>
        ) : null}

        {!isWorker ? (
          <Link href="/book" className="btn" style={{ marginTop: 8 }}>➕ {t('b.request')}</Link>
        ) : null}
      </main>
      </PullToRefresh>
      <Dock items={isWorker ? navWorker(t) : navNormal(t)} />
    </Shell>
  );
}

function JobRow({ job, lang, t, db }: any) {
  const w = job.assignedWorkerId ? db.workers.find((x: any) => x.id === job.assignedWorkerId) : null;
  const tone = job.status === 'completed' ? 'em'
    : job.status === 'requested' ? 'in'
    : job.status.startsWith('cancelled') || job.status === 'expired' ? 'red' : 'gd';
  return (
    <Link href={`/job/${job.id}`} style={{ display: 'block' }}>
      <GlassCard interactive className="pad-s">
        <div className="between top">
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="t-sm strong clamp-2" style={{ lineHeight: 1.35 }}>{job.title}</div>
            <div className="t-xs" style={{ marginTop: 4 }}>
              {job.serviceId ? serviceName(job.serviceId, lang) + ' · ' : ''}{job.geo.areaName.split(',')[0]}
            </div>
          </div>
          <span className={`tag ${tone}`}>{t(`j.${job.status}`)}</span>
        </div>
        <div className="between" style={{ marginTop: 10 }}>
          <span className="t-xs">{w ? `👷 ${w.name}` : ''}</span>
          <span className="t-sm strong t-num"><Money amount={job.agreedAmount ?? job.priceMin} /></span>
        </div>
      </GlassCard>
    </Link>
  );
}
