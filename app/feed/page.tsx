'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell';
import { Guard, SetupNotice } from '@/components/guard';
import { Button, Chip, EmptyState, SkeletonList } from '@/components/ui';
import { PostCard } from '@/components/post-card';
import { usePosts } from '@/components/data';
import { useLang } from '@/components/providers';
import { Inbox, Plus, Search, X, iconByName } from '@/components/icons';
import { CATEGORIES } from '@/lib/catalog';
import { categoryKey } from '@/lib/i18n';
import type { PostType } from '@/lib/database.types';

type TypeFilter = 'all' | PostType;

function Feed() {
  const { t } = useLang();
  const [type, setType] = useState<TypeFilter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Debounce is unnecessary here: the filter object is memoised on the trimmed
  // term, so a keystroke that does not change the term does not refetch.
  const term = search.trim();

  const filter = useMemo(
    () => ({
      ...(type === 'all' ? {} : { type }),
      ...(category ? { category } : {}),
      ...(term.length >= 2 ? { search: term } : {}),
      limit: 40,
    }),
    [type, category, term],
  );

  const { data: posts, loading, error, reload } = usePosts(filter);

  const filtersOn = type !== 'all' || category !== null || term.length > 0;

  return (
    <>
      <SetupNotice />

      <div className="page-head">
        <h1>{t('feedTitle')}</h1>
        <p className="lede">{t('feedSub')}</p>
      </div>

      <div className="stack" style={{ marginBottom: 18 }}>
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
            <button
              className="iconbtn trail"
              onClick={() => setSearch('')}
              aria-label={t('close')}
              type="button"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="row-wrap">
          <Chip on={type === 'all'} onClick={() => setType('all')}>
            {t('filterAll')}
          </Chip>
          <Chip on={type === 'job'} onClick={() => setType('job')}>
            {t('filterJobs')}
          </Chip>
          <Chip on={type === 'update'} onClick={() => setType('update')}>
            {t('filterUpdates')}
          </Chip>

          <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 2px' }} />

          <Chip on={category === null} onClick={() => setCategory(null)}>
            {t('anyCategory')}
          </Chip>
          {CATEGORIES.map((entry) => {
            const Icon = iconByName(entry.icon);
            return (
              <Chip
                key={entry.id}
                on={category === entry.id}
                onClick={() => setCategory(category === entry.id ? null : entry.id)}
              >
                <Icon size={13} />
                {t(categoryKey(entry.id))}
              </Chip>
            );
          })}
        </div>
      </div>

      {loading ? <SkeletonList count={4} /> : null}

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

      {!loading && !error && posts.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title={t('emptyFeedTitle')}
          body={filtersOn ? t('noPeopleBody') : t('emptyFeedBody')}
          action={
            filtersOn ? (
              <Button
                variant="soft"
                onClick={() => {
                  setType('all');
                  setCategory(null);
                  setSearch('');
                }}
              >
                {t('filterAll')}
              </Button>
            ) : (
              <Link href="/post/new">
                <Button variant="primary">
                  <Plus size={16} />
                  {t('navNewPost')}
                </Button>
              </Link>
            )
          }
        />
      ) : null}

      {!loading && !error && posts.length > 0 ? (
        <div className="stack">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={reload} compact />
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function FeedPage() {
  return (
    <AppShell>
      <Guard>
        <Feed />
      </Guard>
    </AppShell>
  );
}
