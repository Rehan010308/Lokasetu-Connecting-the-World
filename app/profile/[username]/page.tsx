'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, SkeletonList } from '@/components/ui';
import { PersonRow } from '@/components/person-row';
import { PostCard } from '@/components/post-card';
import { ProposePrice } from '@/components/offer';
import { useConnections, usePosts } from '@/components/data';
import { useAuth, useLang } from '@/components/providers';
import { BadgeCheck, Inbox, MapPin } from '@/components/icons';
import { getProfileByUsername } from '@/lib/queries';
import { displayName, handleOf, type Profile } from '@/lib/model';
import { monthYear, rupees } from '@/lib/format';
import { categoryKey } from '@/lib/i18n';

function ProfileScreen({ username }: { username: string }) {
  const { t } = useLang();
  const { userId, profile: me } = useAuth();

  const [person, setPerson] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connections = useConnections();
  // Held back until the profile resolves: a query filtered on an id we do not
  // have yet is a guaranteed round trip for nothing.
  const posts = usePosts({ authorId: person?.id ?? '', limit: 20 }, Boolean(person));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProfileByUsername(username).then((result) => {
      if (!alive) return;
      setPerson(result.data);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="stack">
        <Card pad="lg">
          <div className="row" style={{ gap: 14 }}>
            <Skeleton kind="avatar" className="lg" />
            <div className="stack-s grow">
              <Skeleton kind="title" width="45%" />
              <Skeleton kind="line" width="30%" />
            </div>
          </div>
        </Card>
        <SkeletonList count={2} />
      </div>
    );
  }

  if (error || !person) {
    return (
      <EmptyState
        title={t('notFoundBody')}
        body={error ?? undefined}
        action={
          <Link href="/network">
            <Button variant="soft">{t('navNetwork')}</Button>
          </Link>
        }
      />
    );
  }

  const isSelf = person.id === userId;
  const canOffer = me?.role === 'employer' && person.role === 'worker' && !isSelf;

  return (
    <div className="stack-l">
      <Card pad="lg">
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <Avatar profile={person} size="xl" />
          <div className="grow" style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.4rem', marginBottom: 2 }}>
              {displayName(person)}
              {person.verified ? (
                <BadgeCheck size={18} style={{ display: 'inline', marginLeft: 6, color: 'var(--brand)', verticalAlign: '-3px' }} />
              ) : null}
            </h1>
            <div className="row-wrap" style={{ marginBottom: 8 }}>
              <span className="small dim">{handleOf(person)}</span>
              <Badge tone={person.role === 'worker' ? 'brand' : 'info'}>
                {person.role === 'worker' ? t('filterWorkers') : t('filterEmployers')}
              </Badge>
              {person.verified ? <Badge tone="ok">{t('verifiedLabel')}</Badge> : null}
            </div>

            {person.location ? (
              <div className="row small muted" style={{ gap: 5, marginBottom: 4 }}>
                <MapPin size={14} />
                {person.location}
              </div>
            ) : null}

            {person.hourly_rate ? (
              <div className="small muted">
                <span className="price">{rupees(person.hourly_rate)}</span> {t('perHour')}
              </div>
            ) : null}

            <div className="tiny dim" style={{ marginTop: 6 }}>
              {t('memberSince')} {monthYear(person.created_at)}
            </div>
          </div>
        </div>

        {person.bio ? (
          <p className="muted" style={{ marginTop: 16, fontSize: '0.92rem', lineHeight: 1.6 }}>
            {person.bio}
          </p>
        ) : null}

        {person.skills.length ? (
          <div className="row-wrap" style={{ marginTop: 14 }}>
            <span className="eyebrow" style={{ width: '100%', marginBottom: 2 }}>
              {t('skillsLabel')}
            </span>
            {person.skills.map((skill) => (
              <span key={skill} className="badge brand">
                {t(categoryKey(skill))}
              </span>
            ))}
          </div>
        ) : null}

        {!isSelf ? (
          <div className="stack" style={{ marginTop: 18 }}>
            {canOffer ? (
              <ProposePrice
                worker={person}
                employerId={userId as string}
                postId={null}
                label={t('offerWork')}
                block
              />
            ) : null}
            <Card pad={false} style={{ boxShadow: 'none' }}>
              <PersonRow
                person={person}
                connections={connections.data}
                meId={userId}
                onChanged={connections.reload}
              />
            </Card>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <Link href="/me">
              <Button variant="soft" block>
                {t('editProfile')}
              </Button>
            </Link>
          </div>
        )}
      </Card>

      <section>
        <div className="section-title">{t('theirPosts')}</div>
        {posts.loading ? (
          <SkeletonList count={2} />
        ) : posts.data.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title={t('noPostsTitle')} body={t('noPostsBody')} />
        ) : (
          <div className="stack">
            {posts.data.map((post) => (
              <PostCard key={post.id} post={post} onDeleted={posts.reload} compact />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const raw = Array.isArray(params?.username) ? params.username[0] : params?.username;
  const username = typeof raw === 'string' ? decodeURIComponent(raw) : '';

  return (
    <AppShell back="/network" title="">
      <Guard>
        {username ? <ProfileScreen username={username} /> : <EmptyState title="Not found" />}
      </Guard>
    </AppShell>
  );
}
