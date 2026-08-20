'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Button, Card, EmptyState, Skeleton, Stat } from '@/components/ui';
import { useOffers } from '@/components/data';
import { useAuth, useLang } from '@/components/providers';
import { TrendingUp, Wallet } from '@/components/icons';
import { earningsFor } from '@/lib/model';
import { compactNumber, rupees } from '@/lib/format';

function Earnings() {
  const { t } = useLang();
  const { userId, profile } = useAuth();
  const { data: offers, loading } = useOffers();

  // `new Date()` is read once per render rather than inside the pure function,
  // so `earningsFor` stays testable with a fixed clock.
  const summary = useMemo(() => earningsFor(offers, userId, new Date()), [offers, userId]);

  if (profile?.role === 'employer') {
    return (
      <EmptyState
        icon={<Wallet size={22} />}
        title={t('workersOnly')}
        body={t('earningsSub')}
        action={
          <Link href="/offers">
            <Button variant="soft">{t('navOffers')}</Button>
          </Link>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="stack">
        <div className="grid-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} kind="block" />
          ))}
        </div>
        <Skeleton kind="block" />
      </div>
    );
  }

  if (summary.jobs === 0) {
    return (
      <>
        <div className="page-head">
          <h1>{t('earningsTitle')}</h1>
          <p className="lede">{t('earningsSub')}</p>
        </div>
        <EmptyState
          icon={<Wallet size={22} />}
          title={t('noEarningsTitle')}
          body={t('noEarningsBody')}
          action={
            <Link href="/offers">
              <Button variant="soft">{t('navOffers')}</Button>
            </Link>
          }
        />
      </>
    );
  }

  const peak = Math.max(...summary.buckets.map((b) => b.total), 1);

  return (
    <>
      <div className="page-head">
        <h1>{t('earningsTitle')}</h1>
        <p className="lede">{t('earningsSub')}</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 18 }}>
        <Stat hero label={t('lifetimeLabel')} value={rupees(summary.lifetime)} note={`${summary.jobs} · ${t('jobsDone')}`} />
        <Stat label={t('thisMonth')} value={rupees(summary.thisMonth)} />
        <Stat label={t('averageJob')} value={rupees(summary.average)} />
        <Stat label={t('bestJob')} value={rupees(summary.best)} />
      </div>

      <Card pad="lg">
        <div className="spread" style={{ marginBottom: 6 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            <TrendingUp size={15} />
            {t('lastSixMonths')}
          </div>
        </div>

        <div className="chart">
          {summary.buckets.map((bucket) => {
            const height = bucket.total > 0 ? Math.max(6, Math.round((bucket.total / peak) * 100)) : 3;
            return (
              <div className="chart-col" key={bucket.key}>
                <div
                  className={`chart-bar ${bucket.total === 0 ? 'empty' : ''}`}
                  style={{ height: `${height}%` }}
                  title={`${bucket.label}: ${rupees(bucket.total)}`}
                >
                  {bucket.total === peak && bucket.total > 0 ? (
                    <span className="bar-value">{compactNumber(bucket.total)}</span>
                  ) : null}
                </div>
                <div className="chart-label">{bucket.label}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

export default function EarningsPage() {
  return (
    <AppShell>
      <Guard>
        <Earnings />
      </Guard>
    </AppShell>
  );
}
