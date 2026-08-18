'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { rankWorkers } from '@/lib/ai/matching';
import { formatKm } from '@/lib/geo';
import { categoryById } from '@/lib/ai/taxonomy';
import { useActions, useCurrentWorker, useStore, useT } from '@/components/store';
import {
  Empty, LangButton, Loading, Money, Shell, TopBar, UrgencyTag, WorkerTabs,
} from '@/components/ui';

export default function WorkerJobs() {
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useCurrentWorker();
  const { t } = useT();
  const { logout } = useActions();

  React.useEffect(() => {
    if (ready && !me) router.replace('/worker/onboarding');
  }, [ready, me, router]);

  const feed = React.useMemo(() => {
    if (!me) return [];
    return db.jobs
      .filter((j) => j.status === 'open')
      .map((job) => {
        const [m] = rankWorkers(job, [me]);
        return m ? { job, match: m } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.match.score - a.match.score) as any[];
  }, [db.jobs, me]);

  if (!ready || !me) return <Shell><Loading text="…" /></Shell>;

  return (
    <Shell>
      <TopBar
        title={me.name}
        subtitle={`${categoryById(me.category).icon} ${t(`cat.${me.category}` as any)} · ${me.geo.areaName}`}
        right={<LangButton />}
      />
      <div className="page stack">
        <div className="row-between">
          <h2 className="title">{t('w.nav.jobs')}</h2>
          <span className="pill">{feed.length}</span>
        </div>

        {feed.length === 0 ? (
          <Empty icon="🔎" text={t('w.jobs.empty')} />
        ) : (
          feed.map(({ job, match }) => {
            const quoted = db.quotes.some((q) => q.jobId === job.id && q.workerId === me.id);
            return (
              <Link key={job.id} href={`/worker/job/${job.id}`} className="card tap" style={{ display: 'block' }}>
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <div className="bold" style={{ fontSize: 17, lineHeight: 1.3 }}>{job.title}</div>
                    <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
                      <UrgencyTag u={job.urgency} />
                      <span className="pill">📍 {formatKm(match.km)}</span>
                      <span className="pill">🏘️ {job.geo.areaName.split(',')[0]}</span>
                    </div>
                  </div>
                  <div className={`score${match.score < 70 ? ' mid' : ''}`}>{match.score}</div>
                </div>

                <div className="divider" style={{ margin: '12px 0' }} />

                <div className="row-between">
                  <div>
                    <div className="tiny">{t('w.jobs.suggested')}</div>
                    <div className="bold" style={{ fontSize: 17 }}>
                      <Money amount={job.priceMin} /> – <Money amount={job.priceMax} />
                    </div>
                  </div>
                  <span className={`btn sm ${quoted ? 'secondary' : ''}`}>
                    {quoted ? `✓ ${t('w.jobs.quoted')}` : t('w.jobs.quote')}
                  </span>
                </div>

                {match.reasons.length ? (
                  <div className="tiny" style={{ marginTop: 10 }}>
                    ✨ {match.reasons.join(' · ')}
                  </div>
                ) : null}
              </Link>
            );
          })
        )}

        <button className="btn ghost" onClick={() => { logout(); router.push('/'); }}>
          {t('c.logout')}
        </button>
      </div>
      <WorkerTabs />
    </Shell>
  );
}
