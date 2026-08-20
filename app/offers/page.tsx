'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Button, EmptyState, Segment, SkeletonList } from '@/components/ui';
import { OfferCard } from '@/components/offer';
import { useOffers } from '@/components/data';
import { useAuth, useLang } from '@/components/providers';
import { ArrowLeftRight, Inbox } from '@/components/icons';
import { offerPermissions, type Offer } from '@/lib/model';

type Tab = 'incoming' | 'outgoing' | 'settled';

function Offers() {
  const { t } = useLang();
  const { userId } = useAuth();
  const { data: offers, loading, error, reload } = useOffers();
  const [tab, setTab] = useState<Tab>('incoming');

  const groups = useMemo(() => {
    const incoming: Offer[] = [];
    const outgoing: Offer[] = [];
    const settled: Offer[] = [];
    for (const offer of offers) {
      const can = offerPermissions(offer, userId);
      if (can.isSettled) settled.push(offer);
      else if (can.waitingOn === 'you') incoming.push(offer);
      else outgoing.push(offer);
    }
    return { incoming, outgoing, settled };
  }, [offers, userId]);

  const shown = groups[tab];

  return (
    <>
      <div className="page-head">
        <h1>{t('offersTitle')}</h1>
        <p className="lede">{t('offersSub')}</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segment<Tab>
          block
          value={tab}
          onChange={setTab}
          options={[
            { value: 'incoming', label: `${t('tabIncoming')}${groups.incoming.length ? ` (${groups.incoming.length})` : ''}` },
            { value: 'outgoing', label: `${t('tabOutgoing')}${groups.outgoing.length ? ` (${groups.outgoing.length})` : ''}` },
            { value: 'settled', label: `${t('tabSettled')}${groups.settled.length ? ` (${groups.settled.length})` : ''}` },
          ]}
        />
      </div>

      {loading ? <SkeletonList count={2} /> : null}

      {!loading && error ? (
        <EmptyState
          title={t('somethingWrong')}
          body={error}
          action={
            <Button variant="soft" onClick={reload}>
              {t('retry')}
            </Button>
          }
        />
      ) : null}

      {!loading && !error && shown.length === 0 ? (
        <EmptyState
          icon={tab === 'incoming' ? <Inbox size={22} /> : <ArrowLeftRight size={22} />}
          title={t('noOffersYet')}
          body={t('noOffersYetBody')}
          action={
            <Link href="/feed">
              <Button variant="soft">{t('navFeed')}</Button>
            </Link>
          }
        />
      ) : null}

      {!loading && !error && shown.length > 0 ? (
        <div className="stack">
          {shown.map((offer) => (
            <OfferCard key={offer.id} offer={offer} viewerId={userId} onChanged={reload} />
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function OffersPage() {
  return (
    <AppShell>
      <Guard>
        <Offers />
      </Guard>
    </AppShell>
  );
}
