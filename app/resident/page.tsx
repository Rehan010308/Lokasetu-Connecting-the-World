'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActions, useCurrentResident, useStore, useT } from '@/components/store';
import {
  CategoryTag, Empty, LangButton, Loading, Money, ResidentTabs, Shell, StatusTag, TopBar,
} from '@/components/ui';

export default function ResidentHome() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useCurrentResident();
  const { t } = useT();
  const { logout } = useActions();

  React.useEffect(() => {
    if (ready && !me) router.replace('/resident/login');
  }, [ready, me, router]);

  if (!ready || !me) return <Shell><Loading text="…" /></Shell>;

  const mine = db.jobs.filter((j) => j.residentId === me.id).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Shell>
      <TopBar title={me.name} subtitle={`📍 ${me.geo.areaName}`} right={<LangButton />} />
      <div className="page stack">
        <Link href="/resident/new" className="btn">➕ {t('r.nav.post')}</Link>

        <div className="row-between" style={{ marginTop: 6 }}>
          <h2 className="title">{t('r.nav.mine')}</h2>
          <span className="pill">{mine.length}</span>
        </div>

        {mine.length === 0 ? <Empty icon="📋" text={t('r.mine.empty')} /> : null}

        {mine.map((j) => {
          const quotes = db.quotes.filter((q) => q.jobId === j.id);
          const worker = j.assignedWorkerId ? db.workers.find((w) => w.id === j.assignedWorkerId) : null;
          return (
            <Link key={j.id} href={`/resident/job/${j.id}`} className="card tap" style={{ display: 'block' }}>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="bold grow" style={{ fontSize: 17, lineHeight: 1.3 }}>{j.title}</div>
                <StatusTag s={j.status} />
              </div>
              <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                <CategoryTag id={j.category} />
                {j.status === 'open' ? (
                  <span className="pill amber">💬 {quotes.length} {t('r.job.quotes')}</span>
                ) : null}
                {worker ? <span className="pill green">👷 {worker.name}</span> : null}
              </div>
              <div className="row-between" style={{ marginTop: 10 }}>
                <span className="tiny">{j.geo.areaName}</span>
                <span className="bold">
                  <Money amount={j.agreedAmount ?? j.priceMin} />
                  {j.agreedAmount ? '' : <> – <Money amount={j.priceMax} /></>}
                </span>
              </div>
            </Link>
          );
        })}

        <button className="btn ghost" onClick={() => { logout(); router.push('/'); }}>
          {t('c.logout')}
        </button>
      </div>
      <ResidentTabs />
    </Shell>
  );
}
