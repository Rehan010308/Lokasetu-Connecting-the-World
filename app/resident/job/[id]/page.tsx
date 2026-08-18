'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { rankWorkers, type MatchResult } from '@/lib/ai/matching';
import { formatKm } from '@/lib/geo';
import { categoryById } from '@/lib/ai/taxonomy';
import type { PaymentMethod } from '@/lib/types';
import { useActions, useCurrentResident, useStore, useT } from '@/components/store';
import { Chat } from '@/components/chat';
import {
  Avatar, CategoryTag, Loading, Money, Shell, StatusTag, TopBar, TrustBars, UrgencyTag,
} from '@/components/ui';

const METHODS: PaymentMethod[] = ['upi', 'gpay', 'phonepe', 'paytm', 'cash'];

export default function ResidentJobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id as string;
  const router = useRouter();
  const { db, ready } = useStore();
  const me = useCurrentResident();
  const { t } = useT();
  const { hire, confirmDone, submitReview, setPayment } = useActions();

  const [rating, setRating] = React.useState<{ punctual?: boolean; satisfactory?: boolean; hireAgain?: boolean }>({});
  const [openWorker, setOpenWorker] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (ready && !me) router.replace('/resident/login');
  }, [ready, me, router]);

  const job = db.jobs.find((j) => j.id === jobId);

  const matches: MatchResult[] = React.useMemo(
    () => (job ? rankWorkers(job, db.workers).slice(0, 8) : []),
    [job, db.workers]
  );

  if (!ready || !me) return <Shell><Loading text="…" /></Shell>;
  if (!job) return <Shell><TopBar title="—" back /><div className="page"><p>Request not found.</p></div></Shell>;

  const quotes = db.quotes.filter((q) => q.jobId === job.id);
  const worker = job.assignedWorkerId ? db.workers.find((w) => w.id === job.assignedWorkerId) : null;
  const review = db.reviews.find((r) => r.jobId === job.id);
  const ratingComplete =
    rating.punctual !== undefined && rating.satisfactory !== undefined && rating.hireAgain !== undefined;

  return (
    <Shell>
      <TopBar title={t('r.nav.mine')} back="/resident" subtitle={job.geo.areaName} />
      <div className="page stack">

        {/* ---------- the request ---------- */}
        <div className="card">
          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            <CategoryTag id={job.category} />
            <UrgencyTag u={job.urgency} />
            <StatusTag s={job.status} />
          </div>
          <div className="bold" style={{ fontSize: 19, lineHeight: 1.3 }}>{job.title}</div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="kv">
            <span className="k">{t('r.review.price')}</span>
            <span className="v"><Money amount={job.priceMin} /> – <Money amount={job.priceMax} /></span>
          </div>
          <div className="tiny" style={{ marginTop: 6 }}>ℹ️ {job.priceBasis}</div>
        </div>

        {/* ---------- quotes received ---------- */}
        {job.status === 'open' ? (
          <>
            <h3 className="title">💬 {t('r.job.quotes')} ({quotes.length})</h3>
            {quotes.length === 0 ? (
              <div className="banner">{t('r.job.noQuotes')}</div>
            ) : (
              quotes
                .slice()
                .sort((a, b) => a.amount - b.amount)
                .map((q) => {
                  const w = db.workers.find((x) => x.id === q.workerId);
                  if (!w) return null;
                  return (
                    <div key={q.id} className="card">
                      <div className="row" style={{ gap: 12 }}>
                        <Avatar name={w.name} />
                        <div className="grow">
                          <div className="bold">{w.name}</div>
                          <div className="tiny">
                            {categoryById(w.category).icon} {w.experienceYears} {t('c.years')} ·
                            {w.trust.reviewCount ? ` ⭐ ${w.trust.overall.toFixed(1)}` : ` ✨ ${t('trust.new')}`}
                          </div>
                        </div>
                        <div className="price" style={{ fontSize: 20 }}><Money amount={q.amount} /></div>
                      </div>
                      {q.note ? <p className="muted" style={{ marginTop: 8 }}>&ldquo;{q.note}&rdquo;</p> : null}
                      <div className="spacer" />
                      <button className="btn" onClick={() => hire(job.id, w.id, q.amount)}>
                        ✓ {t('r.job.hire')} — <Money amount={q.amount} />
                      </button>
                    </div>
                  );
                })
            )}
          </>
        ) : null}

        {/* ---------- AI ranked workers ---------- */}
        {job.status === 'open' ? (
          <>
            <h3 className="title" style={{ marginTop: 8 }}>✨ {t('r.job.matches')}</h3>
            {matches.map((m) => {
              const quoted = quotes.some((q) => q.workerId === m.worker.id);
              const expanded = openWorker === m.worker.id;
              return (
                <div key={m.worker.id} className="card">
                  <div className="row" style={{ gap: 12 }}>
                    <Avatar name={m.worker.name} />
                    <div className="grow">
                      <div className="bold">{m.worker.name}</div>
                      <div className="tiny">
                        📍 {formatKm(m.km)} · {m.worker.experienceYears} {t('c.years')}
                        {m.worker.trust.reviewCount ? ` · ⭐ ${m.worker.trust.overall.toFixed(1)}` : ''}
                      </div>
                    </div>
                    <div className={`score${m.score < 70 ? ' mid' : ''}`}>{m.score}</div>
                  </div>

                  <div className="tiny" style={{ marginTop: 10 }}>✨ {m.reasons.join(' · ')}</div>

                  <div className="row" style={{ marginTop: 12, gap: 8 }}>
                    <button
                      className="btn sm secondary grow"
                      onClick={() => setOpenWorker(expanded ? null : m.worker.id)}
                    >
                      {expanded ? t('c.close') : '👤 Details'}
                    </button>
                    <button
                      className="btn sm grow"
                      disabled={quoted}
                      onClick={() => hire(job.id, m.worker.id, Math.round((job.priceMin + job.priceMax) / 2))}
                    >
                      {t('r.job.hire')}
                    </button>
                  </div>

                  {expanded ? (
                    <>
                      <div className="divider" style={{ margin: '14px 0' }} />
                      <div className="chips" style={{ marginBottom: 12 }}>
                        {m.worker.skills.map((s) => <span key={s} className="chip on">{s}</span>)}
                      </div>
                      <TrustBars trust={m.worker.trust} />
                      <div className="divider" style={{ margin: '12px 0' }} />
                      <div className="tiny bold" style={{ marginBottom: 6 }}>Why this score</div>
                      {Object.entries(m.breakdown).map(([k, v]) => (
                        <div className="kv" key={k}>
                          <span className="k">{k}</span>
                          <span className="v">{Math.round(v as number)}</span>
                        </div>
                      ))}
                    </>
                  ) : null}
                </div>
              );
            })}
          </>
        ) : null}

        {/* ---------- hired ---------- */}
        {worker ? (
          <>
            <div className="card">
              <div className="row" style={{ gap: 12 }}>
                <Avatar name={worker.name} />
                <div className="grow">
                  <div className="bold">{worker.name} · {t('r.job.hired')}</div>
                  <div className="tiny">
                    {categoryById(worker.category).icon} {t(`cat.${worker.category}` as any)} · 📞 {worker.phone}
                  </div>
                </div>
              </div>
              <div className="divider" style={{ margin: '14px 0' }} />
              <div className="kv"><span className="k">{t('pay.amount')}</span><span className="v"><Money amount={job.agreedAmount ?? 0} /></span></div>
              <div className="kv"><span className="k">{t('pay.status')}</span><span className="v">{job.paymentStatus === 'paid' ? `✅ ${t('pay.paid')}` : `⏳ ${t('pay.pending')}`}</span></div>
              <label className="lbl" style={{ marginTop: 12 }}>{t('pay.method')}</label>
              <div className="chips">
                {METHODS.map((mth) => (
                  <button
                    key={mth}
                    className={`chip${job.paymentMethod === mth ? ' on' : ''}`}
                    onClick={() => setPayment(job.id, mth, job.paymentStatus === 'paid')}
                  >
                    {mth.toUpperCase()}
                  </button>
                ))}
              </div>
              {job.paymentMethod && job.paymentStatus !== 'paid' ? (
                <>
                  <div className="spacer" />
                  <button className="btn secondary" onClick={() => setPayment(job.id, job.paymentMethod!, true)}>
                    ✓ {t('pay.markPaid')}
                  </button>
                </>
              ) : null}
            </div>

            <Chat jobId={job.id} meRole="resident" meId={me.id} meLang={me.lang} />
          </>
        ) : null}

        {/* ---------- confirm completion ---------- */}
        {job.status === 'worker_done' ? (
          <button className="btn" onClick={() => confirmDone(job.id)}>
            ✓ {t('r.job.confirmDone')}
          </button>
        ) : null}

        {/* ---------- rating ---------- */}
        {job.status === 'completed' && worker && !review ? (
          <div className="card">
            <h3 className="title">⭐ {t('rate.title')}</h3>
            <div className="spacer" />
            {([
              ['punctual', t('rate.punctual')],
              ['satisfactory', t('rate.satisfactory')],
              ['hireAgain', t('rate.again')],
            ] as [keyof typeof rating, string][]).map(([key, label]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div className="bold" style={{ marginBottom: 8 }}>{label}</div>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    className={`btn sm grow ${rating[key] === true ? '' : 'secondary'}`}
                    onClick={() => setRating((p) => ({ ...p, [key]: true }))}
                  >
                    👍 {t('c.yes')}
                  </button>
                  <button
                    className={`btn sm grow ${rating[key] === false ? 'warn' : 'secondary'}`}
                    onClick={() => setRating((p) => ({ ...p, [key]: false }))}
                  >
                    👎 {t('c.no')}
                  </button>
                </div>
              </div>
            ))}
            <button
              className="btn"
              disabled={!ratingComplete}
              onClick={() =>
                submitReview(job.id, worker.id, {
                  punctual: !!rating.punctual,
                  satisfactory: !!rating.satisfactory,
                  hireAgain: !!rating.hireAgain,
                })
              }
            >
              {t('rate.submit')}
            </button>
          </div>
        ) : null}

        {review && worker ? (
          <div className="card">
            <div className="banner">🙏 {t('rate.thanks')}</div>
            <div className="spacer" />
            <TrustBars trust={worker.trust} />
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
