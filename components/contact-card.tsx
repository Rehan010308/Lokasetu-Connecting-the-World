'use client';

/**
 * Contact details, revealed only after an offer is accepted.
 *
 * Before acceptance this renders a locked panel showing the neighbourhood and
 * nothing sharper. After acceptance it shows the name, the phone number, and —
 * for the worker, who has to travel there — the street address with a Google
 * Maps link.
 *
 * The lock is not a UI decision. The phone number and the exact address live in
 * `private_details`, whose Row Level Security policy returns nothing at all
 * unless there is an accepted offer between the two people. If this component
 * were deleted, the data would still be unreachable.
 */

import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Spinner } from './ui';
import { useAuth, useLang } from './providers';
import { Lock, MapPin, Phone, ShieldCheck, User } from './icons';
import { getPrivateDetails } from '@/lib/queries';
import { contactView, fullAddress, locality, mapsUrl, telUrl } from '@/lib/contact';
import { displayName, type Offer } from '@/lib/model';
import type { PrivateDetailsRow } from '@/lib/database.types';

export function ContactCard({ offer }: { offer: Offer }) {
  const { t } = useLang();
  const { userId } = useAuth();

  const view = contactView(offer, userId);
  const [personal, setPersonal] = useState<PrivateDetailsRow | null>(null);
  const [jobDetails, setJobDetails] = useState<PrivateDetailsRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!view.revealed || !view.person) return;

    let alive = true;
    setLoading(true);

    // Their phone lives on their personal row (post_id null). The exact address
    // of this specific job lives on the employer's row for this post.
    const wants: Promise<any>[] = [getPrivateDetails(view.person.id, null)];
    if (view.seesAddress && offer.post_id !== null) {
      wants.push(getPrivateDetails(offer.employer_id, offer.post_id));
    }

    Promise.all(wants).then(([mine, job]) => {
      if (!alive) return;
      setPersonal(mine?.data ?? null);
      setJobDetails(job?.data ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [view.revealed, view.seesAddress, view.person?.id, offer.post_id, offer.employer_id]);

  if (!view.person) return null;

  /* ------------------------------------------------------------- locked -- */
  if (!view.revealed) {
    return (
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <Lock size={15} style={{ color: 'var(--ink-3)' }} />
          <span className="small strong">{t('contactTitle')}</span>
          <Badge className="push">{locality(view.person) || t('areaLabel')}</Badge>
        </div>
        <p className="tiny dim">{t('contactLocked')}</p>
      </div>
    );
  }

  /* ----------------------------------------------------------- revealed -- */
  const phone = personal?.phone ?? null;
  const address = view.seesAddress ? fullAddress(offer.employer, jobDetails) : '';
  const maps = address ? mapsUrl(address) : '';

  return (
    <Card className="fade-in" style={{ marginTop: 12, borderColor: 'var(--ok-line)', background: 'var(--ok-soft)' }}>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <ShieldCheck size={16} style={{ color: 'var(--ok)' }} />
        <span className="small strong" style={{ color: 'var(--ok)' }}>
          {t('contactTitle')}
        </span>
        {loading ? <Spinner /> : null}
      </div>

      <div className="stack-s" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <User size={15} style={{ color: 'var(--ink-3)' }} />
          <span className="strong">{displayName(view.person)}</span>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Phone size={15} style={{ color: 'var(--ink-3)' }} />
          {phone ? (
            <span className="strong" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {phone}
            </span>
          ) : (
            <span className="small dim">{loading ? `${t('loading')}…` : t('noPhoneYet')}</span>
          )}
        </div>

        {view.seesAddress && address ? (
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <MapPin size={15} style={{ color: 'var(--ink-3)', marginTop: 3 }} />
            <span className="small">{address}</span>
          </div>
        ) : null}

        {view.seesAddress && jobDetails?.notes ? (
          <p className="tiny dim" style={{ paddingLeft: 23 }}>
            {jobDetails.notes}
          </p>
        ) : null}
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {phone ? (
          <a href={telUrl(phone)} className="btn good sm" style={{ flex: 1, minWidth: 110 }}>
            <Phone size={15} />
            {t('callNow')}
          </a>
        ) : null}

        {maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary sm"
            style={{ flex: 1, minWidth: 150 }}
          >
            <MapPin size={15} />
            {t('openInMaps')}
          </a>
        ) : null}
      </div>

      <p className="tiny dim" style={{ marginTop: 10 }}>
        {t('privateNote')}
      </p>
    </Card>
  );
}
