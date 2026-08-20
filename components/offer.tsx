'use client';

/**
 * The negotiation, on screen.
 *
 * `OfferCard` renders one live price and exactly the moves the person looking
 * at it is allowed to make — the permission set comes from `offerPermissions`
 * in `lib/model.ts`, which mirrors the database triggers. The button is greyed
 * out for the same reason Postgres would have refused, so nobody presses a
 * button and gets an error.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, Badge, Button, Card, Field, Modal } from './ui';
import { useLang, useToast } from './providers';
import { ArrowLeftRight, Check, IndianRupee, Send, Trash2, X } from './icons';
import { acceptOffer, counterOffer, createOffer, declineOffer, withdrawOffer } from '@/lib/queries';
import {
  counterparty,
  displayName,
  offerPermissions,
  type Offer,
  type Profile,
} from '@/lib/model';
import { parseAmount, rupees, timeAgo } from '@/lib/format';
import type { OfferStatus } from '@/lib/database.types';
import type { TKey } from '@/lib/i18n';

const STATUS_KEY: Record<OfferStatus, TKey> = {
  pending: 'statusPending',
  accepted: 'statusAccepted',
  declined: 'statusDeclined',
  countered: 'statusCountered',
};

const STATUS_TONE: Record<OfferStatus, 'warn' | 'ok' | 'bad' | 'info'> = {
  pending: 'warn',
  accepted: 'ok',
  declined: 'bad',
  countered: 'info',
};

/* ------------------------------------------------------- the price form */

function PriceForm({
  open,
  onClose,
  title,
  description,
  initialAmount,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  initialAmount?: number | null;
  submitLabel: string;
  onSubmit: (amount: number, message: string) => Promise<string | null>;
}) {
  const { t } = useLang();
  const toast = useToast();
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The form stays mounted between openings, so the fields have to be reset
  // when it reopens — otherwise a second counter-offer starts from the number
  // typed into the first one.
  useEffect(() => {
    if (!open) return;
    setAmount(initialAmount ? String(initialAmount) : '');
    setMessage('');
    setError(null);
  }, [open, initialAmount]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (value === null) {
      setError(t('amountLabel'));
      return;
    }
    setError(null);
    setBusy(true);
    const failure = await onSubmit(value, message);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    setAmount('');
    setMessage('');
    toast(t('offerSent'), 'ok');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <form className="stack" onSubmit={submit}>
        <Field label={t('amountLabel')} error={error} htmlFor="offer-amount">
          <div className="input-group">
            <span className="lead">
              <IndianRupee size={16} />
            </span>
            <input
              id="offer-amount"
              className="input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1200"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </Field>

        <Field label={t('messageLabel')} optional htmlFor="offer-message">
          <textarea
            id="offer-message"
            className="textarea"
            style={{ minHeight: 84 }}
            value={message}
            maxLength={400}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>

        <div className="row" style={{ gap: 8 }}>
          <Button type="button" variant="ghost" onClick={onClose} block>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={busy} block>
            <Send size={16} />
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------ propose a price */

/** The employer-side entry point: "Propose custom price". */
export function ProposePrice({
  worker,
  employerId,
  postId,
  onCreated,
  suggested,
  label,
  block = false,
}: {
  worker: Profile;
  employerId: string;
  postId: number | null;
  onCreated?: () => void;
  suggested?: number | null;
  label?: string;
  block?: boolean;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" block={block} onClick={() => setOpen(true)}>
        <IndianRupee size={16} />
        {label ?? t('proposePrice')}
      </Button>

      <PriceForm
        open={open}
        onClose={() => setOpen(false)}
        title={t('proposePrice')}
        description={`${t('negotiationSub')} — ${displayName(worker)}`}
        initialAmount={suggested ?? worker.hourly_rate}
        submitLabel={t('sendOffer')}
        onSubmit={async (amount, message) => {
          const result = await createOffer({
            post_id: postId,
            employer_id: employerId,
            worker_id: worker.id,
            offered_price: amount,
            message,
          });
          if (result.error) return result.error;
          onCreated?.();
          return null;
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------ one offer */

export function OfferCard({
  offer,
  viewerId,
  onChanged,
  showPost = true,
}: {
  offer: Offer;
  viewerId: string | null;
  onChanged?: () => void;
  showPost?: boolean;
}) {
  const { t } = useLang();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [countering, setCountering] = useState(false);

  const can = offerPermissions(offer, viewerId);
  const other = counterparty(offer, viewerId);

  async function run(fn: () => Promise<{ error: string | null }>, okText: string) {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result.error) {
      toast(result.error, 'bad');
      return;
    }
    toast(okText, 'ok');
    onChanged?.();
  }

  return (
    <Card pad={false} className={`offer fade-in ${can.isSettled ? 'settled' : ''}`}>
      <div className="offer-top">
        <Avatar profile={other} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="strong truncate">{displayName(other)}</span>
            <Badge tone={STATUS_TONE[offer.status]} dot>
              {t(STATUS_KEY[offer.status])}
            </Badge>
          </div>
          <div className="tiny dim truncate">
            {can.isEmployer ? t('roleEmployer') : t('roleWorker')} · {timeAgo(offer.updated_at)}
          </div>
        </div>
      </div>

      {showPost && offer.post ? (
        <Link href={`/post/${offer.post.id}`} className="offer-message" style={{ display: 'block' }}>
          <span className="strong">{offer.post.title || offer.post.content.slice(0, 60)}</span>
        </Link>
      ) : null}

      <div className="offer-price-block">
        <div>
          <div className="eyebrow" style={{ marginBottom: 3 }}>
            {t('currentPrice')}
          </div>
          <div className="offer-price">{rupees(offer.offered_price)}</div>
        </div>
        <div className="side">
          <div className="tiny dim" style={{ marginBottom: 5 }}>
            {t('roundLabel')} {offer.round}
          </div>
          <div className="rounds" style={{ justifyContent: 'flex-end' }}>
            {Array.from({ length: Math.min(offer.round, 6) }, (_, i) => (
              <i key={i} className="on" />
            ))}
          </div>
        </div>
      </div>

      {offer.message ? <div className="offer-message">{offer.message}</div> : null}

      {can.isSettled ? (
        <div className="offer-actions">
          <Badge tone={offer.status === 'accepted' ? 'ok' : 'bad'}>
            {offer.status === 'accepted' ? <Check size={13} /> : <X size={13} />}
            {t(STATUS_KEY[offer.status])}
          </Badge>
        </div>
      ) : (
        <>
          {can.proposedCurrentPrice ? (
            <div className="offer-message" style={{ color: 'var(--ink-3)' }}>
              {t('cannotAcceptOwn')}
            </div>
          ) : null}

          <div className="offer-actions">
            <Button
              variant="good"
              size="sm"
              disabled={!can.canAccept || busy}
              onClick={() => run(() => acceptOffer(offer.id), t('statusAccepted'))}
            >
              <Check size={15} />
              {t('accept')}
            </Button>

            <Button
              variant="default"
              size="sm"
              disabled={!can.canCounter || busy}
              onClick={() => setCountering(true)}
            >
              <ArrowLeftRight size={15} />
              {t('counter')}
            </Button>

            <Button
              variant="danger"
              size="sm"
              disabled={!can.canDecline || busy}
              onClick={() => run(() => declineOffer(offer.id), t('statusDeclined'))}
            >
              <X size={15} />
              {t('decline')}
            </Button>

            {can.canWithdraw ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => run(() => withdrawOffer(offer.id), t('withdraw'))}
              >
                <Trash2 size={15} />
                {t('withdraw')}
              </Button>
            ) : null}
          </div>
        </>
      )}

      <PriceForm
        open={countering}
        onClose={() => setCountering(false)}
        title={t('counterTitle')}
        description={t('counterSub')}
        initialAmount={offer.offered_price}
        submitLabel={t('counter')}
        onSubmit={async (amount, message) => {
          const result = await counterOffer(offer.id, amount, message);
          if (result.error) return result.error;
          onChanged?.();
          return null;
        }}
      />
    </Card>
  );
}
