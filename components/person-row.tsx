'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Avatar, Badge, Button } from './ui';
import { useLang, useToast } from './providers';
import { Check, MapPin, UserPlus, X } from './icons';
import {
  removeConnection,
  requestConnection,
  respondToConnection,
} from '@/lib/queries';
import { connectionWith, displayName, handleOf, type Connection, type Profile } from '@/lib/model';
import { rupees } from '@/lib/format';
import { categoryKey } from '@/lib/i18n';

/**
 * One person, plus whichever connection control matches where the two of you
 * currently stand. The state comes from `connectionWith`, which is pure and
 * pinned by tests, so the button can never claim you are connected when you
 * are not.
 */
export function PersonRow({
  person,
  connections,
  meId,
  onChanged,
  action,
}: {
  person: Profile;
  connections: Connection[];
  meId: string | null;
  onChanged?: () => void;
  action?: React.ReactNode;
}) {
  const { t } = useLang();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const view = connectionWith(connections, meId, person.id);

  async function run(fn: () => Promise<{ error: string | null }>, okText?: string) {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result.error) {
      toast(result.error, 'bad');
      return;
    }
    if (okText) toast(okText, 'ok');
    onChanged?.();
  }

  return (
    <div className="person">
      <Link href={`/profile/${person.username ?? ''}`} aria-label={displayName(person)}>
        <Avatar profile={person} />
      </Link>

      <div className="who">
        <div className="name truncate">
          <Link href={`/profile/${person.username ?? ''}`}>{displayName(person)}</Link>
          <Badge tone={person.role === 'worker' ? 'brand' : 'info'}>
            {person.role === 'worker' ? t('filterWorkers') : t('filterEmployers')}
          </Badge>
        </div>
        <div className="sub truncate">
          {handleOf(person)}
          {person.location ? (
            <>
              {' · '}
              <MapPin size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {person.location}
            </>
          ) : null}
          {person.hourly_rate ? ` · ${rupees(person.hourly_rate)} ${t('perHour')}` : ''}
        </div>
        {person.skills.length ? (
          <div className="row-wrap" style={{ marginTop: 6 }}>
            {person.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="badge">
                {t(categoryKey(skill))}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {action ?? (
        <div className="row" style={{ gap: 6 }}>
          {view.state === 'none' && meId && meId !== person.id ? (
            <Button
              size="sm"
              variant="soft"
              loading={busy}
              onClick={() => run(() => requestConnection(meId, person.id), t('requestSent'))}
            >
              <UserPlus size={15} />
              {t('connectAction')}
            </Button>
          ) : null}

          {view.state === 'outgoing' ? (
            <Badge tone="warn" dot>
              {t('statusPending')}
            </Badge>
          ) : null}

          {view.state === 'incoming' && view.connection ? (
            <>
              <Button
                size="sm"
                variant="good"
                loading={busy}
                onClick={() => run(() => respondToConnection(view.connection.id, 'accepted'), t('connectedLabel'))}
              >
                <Check size={15} />
                {t('accept')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={busy}
                onClick={() => run(() => respondToConnection(view.connection.id, 'rejected'))}
              >
                <X size={15} />
              </Button>
            </>
          ) : null}

          {view.state === 'connected' && view.connection ? (
            <Button
              size="sm"
              variant="ghost"
              loading={busy}
              onClick={() => run(() => removeConnection(view.connection.id))}
              title={t('removeConnection')}
            >
              <Check size={15} />
              {t('connectedLabel')}
            </Button>
          ) : null}

          {view.state === 'rejected' || view.state === 'blocked' ? (
            <Badge tone="bad">{t('statusDeclined')}</Badge>
          ) : null}
        </div>
      )}
    </div>
  );
}
