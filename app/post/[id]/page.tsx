'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Badge, Button, Card, EmptyState, Skeleton, SkeletonList } from '@/components/ui';
import { PostCard } from '@/components/post-card';
import { OfferCard, ProposePrice } from '@/components/offer';
import { usePostOffers } from '@/components/data';
import { useAuth, useLang, useToast } from '@/components/providers';
import { ArrowLeftRight, CheckCircle2, Inbox } from '@/components/icons';
import { getPost, setPostStatus } from '@/lib/queries';
import type { Post } from '@/lib/model';
import type { PostStatus } from '@/lib/database.types';

function PostScreen({ id }: { id: number }) {
  const { t } = useLang();
  const { userId, profile } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const { data: offers, loading: offersLoading, reload: reloadOffers } = usePostOffers(id);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPost(id).then((result) => {
      if (!alive) return;
      setPost(result.data);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  async function changeStatus(status: PostStatus) {
    if (!post) return;
    const result = await setPostStatus(post.id, status);
    if (result.error) {
      toast(result.error, 'bad');
      return;
    }
    setNonce((n) => n + 1);
    toast(t('saved'), 'ok');
  }

  if (loading) {
    return (
      <div className="stack">
        <Card pad>
          <div className="stack-s">
            <Skeleton kind="title" width="60%" />
            <Skeleton kind="line" />
            <Skeleton kind="line" width="80%" />
          </div>
        </Card>
        <SkeletonList count={2} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <EmptyState
        title={t('postNotFound')}
        body={error ?? undefined}
        action={
          <Link href="/feed">
            <Button variant="soft">{t('backHome')}</Button>
          </Link>
        }
      />
    );
  }

  const mine = post.user_id === userId;
  const author = post.author;
  const canPropose =
    profile?.role === 'employer' && !mine && author !== null && author.role === 'worker';

  return (
    <div className="stack-l">
      <PostCard post={post} onDeleted={() => router.push('/feed')} />

      {mine ? (
        <Card>
          <div className="section-title">{t('statusOpen')}</div>
          <div className="row-wrap">
            <Button
              size="sm"
              variant={post.status === 'assigned' ? 'soft' : 'default'}
              onClick={() => changeStatus('assigned')}
            >
              {t('markAssigned')}
            </Button>
            <Button
              size="sm"
              variant={post.status === 'completed' ? 'soft' : 'default'}
              onClick={() => changeStatus('completed')}
            >
              <CheckCircle2 size={15} />
              {t('markCompleted')}
            </Button>
            {post.status !== 'open' ? (
              <Button size="sm" variant="ghost" onClick={() => changeStatus('open')}>
                {t('reopenPost')}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section>
        <div className="spread" style={{ marginBottom: 12 }}>
          <div>
            <h2>{t('negotiationTitle')}</h2>
            <p className="small muted">{t('negotiationSub')}</p>
          </div>
          {offers.length ? <Badge tone="brand">{offers.length}</Badge> : null}
        </div>

        {canPropose && author ? (
          <div style={{ marginBottom: 14 }}>
            <ProposePrice
              worker={author}
              employerId={userId as string}
              postId={post.id}
              suggested={post.budget}
              onCreated={reloadOffers}
              block
            />
          </div>
        ) : null}

        {!canPropose && profile?.role === 'worker' && !mine ? (
          <div className="banner" style={{ marginBottom: 14 }}>
            <ArrowLeftRight size={17} />
            <div>{t('onlyEmployersOffer')}</div>
          </div>
        ) : null}

        {offersLoading ? (
          <SkeletonList count={1} />
        ) : offers.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title={t('noOffersTitle')} body={t('noOffersBody')} />
        ) : (
          <div className="stack">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                viewerId={userId}
                onChanged={reloadOffers}
                showPost={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = Number(raw);

  return (
    <AppShell back="/feed" title="">
      <Guard>
        {Number.isFinite(id) && id > 0 ? (
          <PostScreen id={id} />
        ) : (
          <EmptyState title="Not found" body="That post id is not a number." />
        )}
      </Guard>
    </AppShell>
  );
}
