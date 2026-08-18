'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentWorker, useStore, useT } from '@/components/store';
import { Empty, Loading, Money, Shell, StatusTag, TopBar, WorkerTabs } from '@/components/ui';

export default function WorkerMine() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useCurrentWorker();
  const { t } = useT();

  React.useEffect(() => {
    if (ready && !me) router.replace('/worker/onboarding');
  }, [ready, me, router]);

  if (!ready || !me) return <Shell><Loading text="…" /></Shell>;

  const mine = db.jobs.filter((j) => j.assignedWorkerId === me.id);
  const quoted = db.jobs.filter(
    (j) => j.status === 'open' && db.quotes.some((q) => q.jobId === j.id && q.workerId === me.id)
  );

  return (
    <Shell>
      <TopBar title={t('w.nav.mine')} />
      <div className="page stack">
        {mine.length === 0 && quoted.length === 0 ? <Empty icon="🧰" text={t('w.mine.empty')} /> : null}

        {mine.map((j) => (
          <Link key={j.id} href={`/worker/job/${j.id}`} className="card tap" style={{ display: 'block' }}>
            <div className="row-between">
              <div className="bold grow">{j.title}</div>
              <StatusTag s={j.status} />
            </div>
            <div className="row-between" style={{ marginTop: 10 }}>
              <span className="muted">{j.geo.areaName}</span>
              <span className="bold"><Money amount={j.agreedAmount ?? j.priceMin} /></span>
            </div>
          </Link>
        ))}

        {quoted.length ? (
          <>
            <div className="divider" />
            <div className="muted bold">⏳ {t('w.jobs.quoted')}</div>
            {quoted.map((j) => {
              const q = db.quotes.find((x) => x.jobId === j.id && x.workerId === me.id)!;
              return (
                <Link key={j.id} href={`/worker/job/${j.id}`} className="card tap" style={{ display: 'block' }}>
                  <div className="row-between">
                    <div className="bold grow">{j.title}</div>
                    <span className="pill amber"><Money amount={q.amount} /></span>
                  </div>
                </Link>
              );
            })}
          </>
        ) : null}
      </div>
      <WorkerTabs />
    </Shell>
  );
}
