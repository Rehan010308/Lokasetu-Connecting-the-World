'use client';

import React from 'react';
import type { Client, Job, Worker } from '@/lib/types';
import { serviceName } from '@/lib/i18n-catalog';
import { etaMinutes } from '@/lib/ai/match';
import { distanceKm, formatDistance } from '@/lib/geo';
import { telLink, waLink, navigateLink } from '@/lib/links';
import { useStore, useT } from './store';
import { Initials, Stars, VerifiedBadge } from './kit';
import { GlassCard } from './aurora';

/* ===========================================================================
   CONTACT HUB
   ---------------------------------------------------------------------------
   What a confirmed booking should open on.
   
   The old screen led with a chat thread. Nobody waiting on an electrician wants
   to type — they want to ring the person, or send one WhatsApp, or see how far
   away they are. Chat is the third thing you reach for, so it is now behind a
   button instead of occupying the fold.

   Everything a person needs mid-booking is in one block: who is coming, are
   they verified, how far away, what for, how much, and the three buttons that
   actually do something. The phone number appears here and nowhere public —
   it is shared because this booking is confirmed, and the card says so.
   =========================================================================== */

const TRAVELLING = ['on_the_way', 'working'];

export function ContactHub({
  job, worker, client, iAmWorker, messageCount, onMessages, showMessages,
}: {
  job: Job;
  worker: Worker | null;
  client: Client | null;
  iAmWorker: boolean;
  messageCount: number;
  onMessages: () => void;
  showMessages: boolean;
}) {
  const { t, lang } = useT();

  /* the person on the other end of this booking */
  const other = iAmWorker ? client : worker;
  if (!other) return null;

  const km = worker ? distanceKm(job.geo, worker.geo) : 0;
  const travelling = TRAVELLING.includes(job.status);
  const eta = etaMinutes(km);

  return (
    <GlassCard className="hub pad" glow={travelling ? 'em' : undefined}>

      {/* ---- who ---- */}
      <div className="hub-who">
        <Initials name={other.name} size="l" tone={iAmWorker ? 'in' : undefined} />
        <div className="grow" style={{ minWidth: 0 }}>
          <h2 className="t-h2 clamp-1">{other.name}</h2>
          <div className="h-2 wrap" style={{ gap: 8, marginTop: 6 }}>
            <span className={`tag ${travelling ? 'em' : ''}`}>
              {travelling ? <span className="live-dot" /> : null}
              {t(`j.${job.status}` as any)}
            </span>
            {worker && !iAmWorker ? <VerifiedBadge v={worker.verification} small /> : null}
          </div>
          {worker && !iAmWorker && worker.reviewCount ? (
            <div style={{ marginTop: 7 }}><Stars value={worker.rating} count={worker.reviewCount} /></div>
          ) : null}
          {iAmWorker && client?.orgName ? <p className="t-xs" style={{ marginTop: 6 }}>{client.orgName}</p> : null}
        </div>
      </div>

      {/* ---- the three things people actually press ---- */}
      <div className="hub-actions">
        <a className="btn md" href={telLink(other.phone)}>
          <span aria-hidden>📞</span> {t('w.callNow')}
        </a>
        <a className="btn ghost md" href={waLink(other.phone, job.title)} target="_blank" rel="noopener noreferrer">
          <span aria-hidden>💬</span> {t('w.whatsapp')}
        </a>
        <a className="btn ghost md" href={navigateLink(job.geo)} target="_blank" rel="noopener noreferrer">
          <span aria-hidden>📍</span> {t('ch.location')}
        </a>
      </div>

      <hr className="rule" />

      {/* ---- the facts of the booking ---- */}
      <div className="hub-facts">
        {job.serviceId ? (
          <div className="kv"><span className="k">{t('ch.service')}</span><span className="v">{serviceName(job.serviceId, lang)}</span></div>
        ) : null}
        <div className="kv"><span className="k">{t('j.address')}</span><span className="v">{job.geo.address ?? job.geo.areaName}</span></div>
        {worker ? (
          <div className="kv">
            <span className="k">{travelling ? t('ch.arriving') : t('w.away')}</span>
            <span className="v t-num">
              {travelling ? `~${eta} ${t('c.min')}` : formatDistance(km, t('c.nearby'))}
            </span>
          </div>
        ) : null}
        <div className="kv">
          <span className="k">📞</span>
          <span className="v t-num">{other.phone}</span>
        </div>
      </div>
      <p className="t-micro" style={{ marginTop: 8 }}>🔒 {t('ch.phoneShown')}</p>

      {/* ---- messaging, deliberately last and deliberately quiet ---- */}
      <button className="btn quiet" style={{ marginTop: 12 }} onClick={onMessages} aria-expanded={showMessages}>
        💬 {showMessages ? t('ch.hide') : t('ch.messages')}
        {!showMessages && messageCount ? ` (${messageCount})` : ''}
      </button>
    </GlassCard>
  );
}
