'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Banner, Button, Card, Field } from '@/components/ui';
import { useAuth, useLang, useToast } from '@/components/providers';
import { AlertTriangle, IndianRupee, Link2, Lock, MapPin, Send } from '@/components/icons';
import { createPost, savePrivateDetails } from '@/lib/queries';
import { locality } from '@/lib/contact';
import { CATEGORIES } from '@/lib/catalog';
import { categoryKey } from '@/lib/i18n';
import { parseAmount } from '@/lib/format';
import type { PostType } from '@/lib/database.types';

function Composer() {
  const { t } = useLang();
  const { userId, profile } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // The account decides what this is. A resident posts job requests; a worker
  // posts availability updates. There is no toggle because there is no choice —
  // and a `posts_guard_role` trigger refuses anything else at the database.
  const type: PostType = profile?.role === 'employer' ? 'job' : 'update';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>(profile?.skills[0] ?? 'electrical');
  const [budget, setBudget] = useState('');
  const [flat, setFlat] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
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
      // Locality only, and derived from the profile — never typed again, and
      // never precise enough to identify a door.
      location: locality(profile) || profile?.location || null,
      media_url: media,
    });

    if (result.error || !result.data) {
      setBusy(false);
      setError(result.error ?? t('somethingWrong'));
      return;
    }

    // The exact address goes to `private_details`, not onto the public post.
    // Only a worker with an accepted offer on this job can read it back.
    if (type === 'job' && (flat.trim() || landmark.trim() || notes.trim())) {
      await savePrivateDetails({
        owner_id: userId as string,
        post_id: result.data.id,
        flat_number: flat,
        landmark,
        notes,
      });
    }

    setBusy(false);
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

          <div className="panel row" style={{ gap: 8 }}>
            <Lock size={15} style={{ color: 'var(--ink-3)' }} />
            <span className="small strong grow">
              {type === 'job' ? t('typeJob') : t('typeUpdate')}
            </span>
            <span className="tiny dim" style={{ textAlign: 'right' }}>
              {type === 'job' ? t('onlyResidentsPostJobs') : t('onlyWorkersPostUpdates')}
            </span>
          </div>

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

            {type === 'job' ? (
              <Field label={t('flatLabel')} optional htmlFor="flat">
                <input
                  id="flat"
                  className="input"
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                />
              </Field>
            ) : null}
          </div>

          {type === 'job' ? (
            <>
              <div className="panel">
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <MapPin size={15} style={{ color: 'var(--ink-3)' }} />
                  <span className="small strong grow">{t('jobAddressTitle')}</span>
                  <span className="badge">{locality(profile) || t('areaLabel')}</span>
                </div>
                <p className="tiny dim">{t('jobAddressSub')}</p>
              </div>

              <Field label={t('landmarkLabel')} optional htmlFor="landmark">
                <input
                  id="landmark"
                  className="input"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </Field>

              <Field label={t('notesLabel')} optional htmlFor="notes">
                <textarea
                  id="notes"
                  className="textarea"
                  style={{ minHeight: 72 }}
                  maxLength={400}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </>
          ) : null}

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
