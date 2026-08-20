'use client';

import React, { useMemo, useState } from 'react';
import { AppShell } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Button, Card, Chip, EmptyState, Segment, SkeletonRows } from '@/components/ui';
import { PersonRow } from '@/components/person-row';
import { useConnections, usePeople } from '@/components/data';
import { useAuth, useLang } from '@/components/providers';
import { Search, UserPlus, Users, X } from '@/components/icons';
import { acceptedPeers, incomingRequests, outgoingRequests } from '@/lib/model';
import type { Role } from '@/lib/database.types';

type Tab = 'discover' | 'requests' | 'connections';

function Network() {
  const { t } = useLang();
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>('discover');
  const [role, setRole] = useState<Role | null>(null);
  const [search, setSearch] = useState('');

  const term = search.trim();

  const peopleFilter = useMemo(
    () => ({
      ...(role ? { role } : {}),
      ...(term.length >= 2 ? { search: term } : {}),
      ...(userId ? { excludeId: userId } : {}),
      limit: 60,
    }),
    [role, term, userId],
  );

  const people = usePeople(peopleFilter);
  const connections = useConnections();

  const incoming = incomingRequests(connections.data, userId);
  const outgoing = outgoingRequests(connections.data, userId);
  const peers = acceptedPeers(connections.data, userId);

  function refreshAll() {
    connections.reload();
    people.reload();
  }

  return (
    <>
      <div className="page-head">
        <h1>{t('networkTitle')}</h1>
        <p className="lede">{t('networkSub')}</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segment<Tab>
          block
          value={tab}
          onChange={setTab}
          options={[
            { value: 'discover', label: t('tabDiscover') },
            { value: 'requests', label: `${t('tabRequests')}${incoming.length ? ` (${incoming.length})` : ''}` },
            { value: 'connections', label: `${t('tabConnections')}${peers.length ? ` (${peers.length})` : ''}` },
          ]}
        />
      </div>

      {tab === 'discover' ? (
        <>
          <div className="stack" style={{ marginBottom: 16 }}>
            <div className="input-group">
              <span className="lead">
                <Search size={16} />
              </span>
              <input
                className="input"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('searchLabel')}
              />
              {search ? (
                <button className="iconbtn trail" type="button" onClick={() => setSearch('')} aria-label={t('close')}>
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div className="row-wrap">
              <Chip on={role === null} onClick={() => setRole(null)}>
                {t('filterEveryone')}
              </Chip>
              <Chip on={role === 'worker'} onClick={() => setRole('worker')}>
                {t('filterWorkers')}
              </Chip>
              <Chip on={role === 'employer'} onClick={() => setRole('employer')}>
                {t('filterEmployers')}
              </Chip>
            </div>
          </div>

          {people.loading ? <SkeletonRows count={5} /> : null}

          {!people.loading && people.error ? (
            <EmptyState
              title={t('somethingWrong')}
              body={people.error}
              action={
                <Button variant="soft" onClick={people.reload}>
                  {t('retry')}
                </Button>
              }
            />
          ) : null}

          {!people.loading && !people.error && people.data.length === 0 ? (
            <EmptyState icon={<Users size={22} />} title={t('noPeopleTitle')} body={t('noPeopleBody')} />
          ) : null}

          {!people.loading && people.data.length > 0 ? (
            <Card pad={false} className="divide">
              {people.data.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  connections={connections.data}
                  meId={userId}
                  onChanged={refreshAll}
                />
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === 'requests' ? (
        <div className="stack-l">
          <section>
            <div className="section-title">{t('tabIncoming')}</div>
            {connections.loading ? (
              <SkeletonRows count={2} />
            ) : incoming.length === 0 ? (
              <EmptyState icon={<UserPlus size={22} />} title={t('noRequestsTitle')} body={t('noRequestsBody')} />
            ) : (
              <Card pad={false} className="divide">
                {incoming.map((connection) =>
                  connection.requester ? (
                    <PersonRow
                      key={connection.id}
                      person={connection.requester}
                      connections={connections.data}
                      meId={userId}
                      onChanged={refreshAll}
                    />
                  ) : null,
                )}
              </Card>
            )}
          </section>

          {outgoing.length > 0 ? (
            <section>
              <div className="section-title">{t('tabOutgoing')}</div>
              <Card pad={false} className="divide">
                {outgoing.map((connection) =>
                  connection.receiver ? (
                    <PersonRow
                      key={connection.id}
                      person={connection.receiver}
                      connections={connections.data}
                      meId={userId}
                      onChanged={refreshAll}
                    />
                  ) : null,
                )}
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'connections' ? (
        connections.loading ? (
          <SkeletonRows count={4} />
        ) : peers.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title={t('noPeopleTitle')} body={t('networkSub')} />
        ) : (
          <Card pad={false} className="divide">
            {peers.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                connections={connections.data}
                meId={userId}
                onChanged={refreshAll}
              />
            ))}
          </Card>
        )
      ) : null}
    </>
  );
}

export default function NetworkPage() {
  return (
    <AppShell>
      <Guard>
        <Network />
      </Guard>
    </AppShell>
  );
}
