'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Banner, Button, Card, Field, Segment } from '@/components/ui';
import { useAuth, useLang, useToast } from '@/components/providers';
import { AlertTriangle, IndianRupee, Link2, MapPin, Send } from '@/components/icons';
import { createPost } from '@/lib/queries';
import { CATEGORIES, CITIES } from '@/lib/catalog';
import { categoryKey } from '@/lib/i18n';
import { parseAmount } from '@/lib/format';
import type { PostType } from '@/lib/database.types';

function Composer() {
  const { t } = useLang();
  const { userId, profile } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // A worker posting an update is the common case; an employer posting a job is
  // the other. Default to whichever matches the account.
  const [type, setType] = useState<PostType>(profile?.role === 'employer' ? 'job' : 'update');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>(profile?.skills[0] ?? 'electrical');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [media, setMedia] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (content.trim().length < 10) {
      setError(t('contentLabel'));
      return;
    }

    let amount: number | null = null;
    if (type === 'job' && budget.trim()) {
      amount = parseAmount(budget);
      if (amount === null) {
        setError(t('budgetLabel'));
        return;
      }
    }

    setBusy(true);
    const result = await createPost({
      user_id: userId as string,
      post_type: type,
      title,
      content,
      category,
      budget: amount,
      location,
      media_url: media,
    });
    setBusy(false);

    if (result.error || !result.data) {
      setError(result.error ?? t('somethingWrong'));
      return;
    }

    toast(t('saved'), 'ok');
    router.push(`/post/${result.data.id}`);
  }

  return (
    <>
      <div className="page-head">
        <h1>{t('newPostTitle')}</h1>
        <p className="lede">{t('newPostSub')}</p>
      </div>

      <Card pad="lg">
        <form className="stack" onSubmit={submit}>
          {error ? (
            <Banner tone="bad" icon={<AlertTriangle size={17} />}>
              {error}
            </Banner>
          ) : null}

          <Segment<PostType>
            block
            value={type}
            onChange={setType}
            options={[
              { value: 'job', label: t('typeJob') },
              { value: 'update', label: t('typeUpdate') },
            ]}
          />

          <Field label={t('titleLabel')} optional htmlFor="title">
            <input
              id="title"
              className="input"
              maxLength={120}
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label={t('contentLabel')} htmlFor="content">
            <textarea
              id="content"
              className="textarea"
              maxLength={2000}
              placeholder={type === 'job' ? t('contentPlaceholderJob') : t('contentPlaceholderUpdate')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>

          <Field label={t('categoryLabel')} htmlFor="category">
            <select
              id="category"
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {t(categoryKey(entry.id))}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid-2">
            {type === 'job' ? (
              <Field label={t('budgetLabel')} optional htmlFor="budget">
                <div className="input-group">
                  <span className="lead">
                    <IndianRupee size={16} />
                  </span>
                  <input
                    id="budget"
                    className="input"
                    inputMode="decimal"
                    placeholder={t('budgetPlaceholder')}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </Field>
            ) : null}

            <Field label={t('locationLabel')} optional htmlFor="location">
              <div className="input-group">
                <span className="lead">
                  <MapPin size={16} />
                </span>
                <input
                  id="location"
                  className="input"
                  list="composer-cities"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <datalist id="composer-cities">
                  {CITIES.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            </Field>
          </div>

          <Field label={t('mediaLabel')} optional htmlFor="media" hint="https://…">
            <div className="input-group">
              <span className="lead">
                <Link2 size={16} />
              </span>
              <input
                id="media"
                className="input"
                type="url"
                value={media}
                onChange={(e) => setMedia(e.target.value)}
              />
            </div>
          </Field>

          <Button type="submit" variant="primary" size="lg" block loading={busy}>
            <Send size={17} />
            {t('publish')}
          </Button>
        </form>
      </Card>
    </>
  );
}

export default function NewPostPage() {
  return (
    <AppShell back="/feed" title="">
      <Guard>
        <Composer />
      </Guard>
    </AppShell>
  );
}
