'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Avatar, Badge, Button, CategoryTag, Card, IconButton } from './ui';
import { useAuth, useLang, useToast } from './providers';
import { ArrowRight, MapPin, MessageSquare, Trash2 } from './icons';
import { deletePost } from '@/lib/queries';
import { displayName, handleOf, type Post } from '@/lib/model';
import { rupees, timeAgo, truncate } from '@/lib/format';
import type { TKey } from '@/lib/i18n';

const STATUS_KEY: Record<Post['status'], TKey> = {
  open: 'statusOpen',
  assigned: 'statusAssigned',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
};

const STATUS_TONE: Record<Post['status'], 'ok' | 'info' | 'warn' | 'bad' | 'default'> = {
  open: 'ok',
  assigned: 'info',
  completed: 'default',
  cancelled: 'bad',
};

export function PostCard({
  post,
  onDeleted,
  compact = false,
}: {
  post: Post;
  onDeleted?: () => void;
  compact?: boolean;
}) {
  const { userId } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [removing, setRemoving] = useState(false);

  const mine = Boolean(userId) && post.user_id === userId;
  const isJob = post.post_type === 'job';

  async function remove() {
    if (!window.confirm(t('confirmDelete'))) return;
    setRemoving(true);
    const result = await deletePost(post.id);
    setRemoving(false);
    if (result.error) {
      toast(result.error, 'bad');
      return;
    }
    onDeleted?.();
  }

  return (
    <Card pad={false} hoverable className="post fade-in">
      <div className="post-head">
        <Link href={post.author?.username ? `/profile/${post.author.username}` : '#'} aria-label={displayName(post.author)}>
          <Avatar profile={post.author} />
        </Link>
        <div className="who grow">
          <div className="name truncate">{displayName(post.author)}</div>
          <div className="meta truncate">
            {handleOf(post.author)}
            {post.author?.location ? ` · ${post.author.location}` : ''}
            {' · '}
            {timeAgo(post.created_at)}
          </div>
        </div>
        {isJob ? (
          <Badge tone={STATUS_TONE[post.status]} dot>
            {t(STATUS_KEY[post.status])}
          </Badge>
        ) : (
          <Badge tone="brand">{t('typeUpdate')}</Badge>
        )}
        {mine ? (
          <IconButton label={t('deleteAction')} onClick={remove} disabled={removing}>
            <Trash2 size={16} />
          </IconButton>
        ) : null}
      </div>

      {post.title ? <div className="post-title">{post.title}</div> : null}
      <p className="post-body">{compact ? truncate(post.content, 180) : post.content}</p>

      {post.media_url ? (
        <div className="post-media">
          {/* User-supplied URL: a plain img avoids allow-listing every host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.media_url} alt="" loading="lazy" />
        </div>
      ) : null}

      <div className="post-foot">
        <CategoryTag id={post.category} />
        {post.location ? (
          <span className="chip" style={{ cursor: 'default' }}>
            <MapPin size={13} />
            {post.location}
          </span>
        ) : null}
        {post.budget !== null ? (
          <span className="post-budget push">
            <b>{rupees(post.budget)}</b>
            <span>{t('budgetLabel')}</span>
          </span>
        ) : null}
      </div>

      <div style={{ padding: '0 0 2px' }}>
        <Link href={`/post/${post.id}`}>
          <Button size="sm" variant="soft" block>
            {isJob ? <MessageSquare size={15} /> : <ArrowRight size={15} />}
            {t('openPost')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
