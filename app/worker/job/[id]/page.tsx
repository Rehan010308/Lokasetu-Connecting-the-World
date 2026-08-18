'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { rankWorkers } from '@/lib/ai/matching';
import { formatKm } from '@/lib/geo';
import { useActions, useCurrentWorker, useStore, useT } from '@/components/store';
import { Chat } from '@/components/chat';
import {
  CategoryTag, Loading, Money, Shell, StatusTag, TopBar, UrgencyTag,
} from '@/components/ui';

export default function WorkerJobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id as string;
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useCurrentWorker();
  const { t } = useT();
  const { addQuote, workerMarkDone } = useActions();

  const job = db.jobs.find((j) => j.id === jobId);
  const myQuote = db.quotes.find((q) => q.jobId === jobId && q.workerId === me?.id);
  const [amount, setAmount] = React.useState<string>('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (ready && !me) router.replace('/worker/onboarding');
  }, [ready, me, router]);

  if (!ready || !me) return <Shell><Loading text="…" /></Shell>;
  if (!job) return <Shell><TopBar title="—" back /><div className="page"><p>Job not found.</p></div></Shell>;

  const [match] = rankWorkers(job, [me]);
  const isMine = job.assignedWorkerId === me.id;
  const suggested = Math.round((job.priceMin + job.priceMax) / 2);

  return (
    <Shell>
      <TopBar title={t('w.jobs.view')} back subtitle={job.geo.areaName} />
      <div className="page stack">
        <div className="card">
          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            <CategoryTag id={job.category} />
            <UrgencyTag u={job.urgency} />
            <StatusTag s={job.status} />
          </div>
          <div className="bold" style={{ fontSize: 19, lineHeight: 1.3 }}>{job.title}</div>
          <p className="muted" style={{ marginTop: 8 }}>&ldquo;{job.rawRequest}&rdquo;</p>

          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="kv"><span className="k">📍 {t('c.away')}</span><span className="v">{match ? formatKm(match.km) : '-'}</span></div>
          <div className="kv"><span className="k">⏱️ {t('r.review.duration')}</span><span className="v">{job.estimatedHours} h</span></div>
          <div className="kv"><span className="k">💰 {t('w.jobs.suggested')}</span><span className="v"><Money amount={job.priceMin} /> – <Money amount={job.priceMax} /></span></div>
          <div className="tiny" style={{ marginTop: 8 }}>ℹ️ {job.priceBasis}</div>
        </div>

        {match ? (
          <div className="card flat">
            <div className="row-between">
              <div className="bold">✨ {match.score}% {t('w.jobs.match')}</div>
            </div>
            <div className="tiny" style={{ marginTop: 6 }}>{match.reasons.join(' · ')}</div>
          </div>
        ) : null}

        {/* -------- quote -------- */}
        {job.status === 'open' ? (
          <div className="card">
            <h3 className="title">{t('w.quote.title')}</h3>
            {myQuote ? (
              <div className="banner" style={{ marginTop: 10 }}>
                ✓ {t('w.jobs.quoted')} — <Money amount={myQuote.amount} />
              </div>
            ) : null}
            <div className="spacer" />
            <button
              className="btn"
              onClick={() => addQuote(job.id, me.id, suggested, note)}
            >
              ✓ {t('w.quote.accept')} (<Money amount={suggested} />)
            </button>
            <div className="divider" style={{ margin: '14px 0' }} />
            <label className="lbl">{t('w.quote.custom')}</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            />
            <label className="lbl" style={{ marginTop: 12 }}>{t('w.quote.note')}</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="spacer" />
            <button
              className="btn secondary"
              disabled={!amount}
              onClick={() => addQuote(job.id, me.id, Number(amount), note)}
            >
              {t('w.quote.send')}
            </button>
          </div>
        ) : null}

        {/* -------- assigned to me -------- */}
        {isMine ? (
          <>
            <div className="card">
              <h3 className="title">💰 {t('pay.title')}</h3>
              <div className="kv"><span className="k">{t('pay.amount')}</span><span className="v"><Money amount={job.agreedAmount ?? 0} /></span></div>
              <div className="kv"><span className="k">{t('pay.status')}</span><span className="v">{job.paymentStatus === 'paid' ? `✅ ${t('pay.paid')}` : `⏳ ${t('pay.pending')}`}</span></div>
              {job.paymentMethod ? (
                <div className="kv"><span className="k">{t('pay.method')}</span><span className="v">{job.paymentMethod.toUpperCase()}</span></div>
              ) : null}
            </div>

            <Chat jobId={job.id} meRole="worker" meId={me.id} meLang={me.lang} />

            {job.status === 'assigned' ? (
              <button className="btn" onClick={() => workerMarkDone(job.id)}>
                ✓ {t('w.job.markDone')}
              </button>
            ) : null}
            {job.status === 'worker_done' ? (
              <div className="banner warn">⏳ {t('w.job.waiting')}</div>
            ) : null}
            {job.status === 'completed' ? (
              <div className="banner">🎉 {t('w.job.done')}</div>
            ) : null}
          </>
        ) : null}

        {job.status !== 'open' && !isMine ? (
          <div className="banner warn">This job has been given to another worker.</div>
        ) : null}
      </div>
    </Shell>
  );
}
