'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, LanguagePicker, ThemeToggle } from '@/components/shell';
import { Guard } from '@/components/guard';
import { Avatar, Badge, Banner, Button, Card, Chip, Field } from '@/components/ui';
import { useAuth, useLang, useToast } from '@/components/providers';
import { AlertTriangle, ArrowUpRight, IndianRupee, Link2, Lock, LogOut, MapPin, Phone, ShieldCheck } from '@/components/icons';
import { getPrivateDetails, savePrivateDetails, updateProfile } from '@/lib/queries';
import { isPhone, normalizePhone } from '@/lib/contact';
import { CATEGORIES, CITIES } from '@/lib/catalog';
import { categoryKey } from '@/lib/i18n';
import { normalizeUsername, parseAmount, rupees } from '@/lib/format';
import { displayName, handleOf } from '@/lib/model';
import { VERSION } from '@/lib/version';

function MyProfile() {
  const { t } = useLang();
  const { profile, email, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState('');
  const [rate, setRate] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [society, setSociety] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the form from the profile once it arrives, and again if it changes
  // underneath (another tab, a realtime update).
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setLocation(profile.location ?? '');
    setAvatar(profile.avatar_url ?? '');
    setRate(profile.hourly_rate ? String(profile.hourly_rate) : '');
    setSkills(profile.skills);
    setCity(profile.city ?? '');
    setArea(profile.area ?? '');
    setSociety(profile.society ?? '');
  }, [profile]);

  // The phone number is not on the profile row. It lives in `private_details`,
  // which nobody but you and an accepted counterparty can read.
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    getPrivateDetails(profile.id, null).then((result) => {
      if (alive) setPhone(result.data?.phone ?? '');
    });
    return () => {
      alive = false;
    };
  }, [profile?.id]);

  if (!profile) return null;

  const isWorker = profile.role === 'worker';

  function toggleSkill(id: string) {
    setSkills((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id].slice(0, 6),
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const handle = normalizeUsername(username);
    if (handle.length < 3) {
      setError(t('usernameLabel'));
      return;
    }

    let hourly: number | null = null;
    if (isWorker && rate.trim()) {
      hourly = parseAmount(rate);
      if (hourly === null) {
        setError(t('rateLabel'));
        return;
      }
    }

    if (phone.trim() && !isPhone(phone)) {
      setError(t('phoneLabel'));
      return;
    }

    setBusy(true);
    const result = await updateProfile(profile.id, {
      full_name: fullName.trim() || handle,
      username: handle,
      bio: bio.trim() || null,
      location: [area.trim(), city.trim()].filter(Boolean).join(', ') || null,
      avatar_url: avatar.trim() || null,
      skills: isWorker ? skills : [],
      hourly_rate: hourly,
      city: city.trim() || null,
      area: area.trim() || null,
      society: society.trim() || null,
    });

    const contact = await savePrivateDetails({
      owner_id: profile.id,
      post_id: null,
      phone: phone.trim() ? normalizePhone(phone) : null,
    });
    setBusy(false);

    if (result.error || contact.error) {
      setError(result.error ?? contact.error);
      return;
    }
    await refreshProfile();
    toast(t('saved'), 'ok');
  }

  return (
    <div className="stack-l">
      <Card pad="lg">
        <div className="row" style={{ gap: 14 }}>
          <Avatar profile={profile} size="lg" />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="strong truncate" style={{ fontSize: '1.05rem' }}>
              {displayName(profile)}
            </div>
            <div className="small dim truncate">
              {handleOf(profile)} {email ? `· ${email}` : ''}
            </div>
          </div>
          {profile.username ? (
            <Link href={`/profile/${profile.username}`}>
              <Button size="sm" variant="ghost">
                <ArrowUpRight size={15} />
              </Button>
            </Link>
          ) : null}
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="row" style={{ gap: 8 }}>
            <Lock size={15} style={{ color: 'var(--ink-3)' }} />
            <div className="grow">
              <div className="small strong">
                {t('accountRole')}:{' '}
                <Badge tone={isWorker ? 'brand' : 'info'}>
                  {isWorker ? t('filterWorkers') : t('filterEmployers')}
                </Badge>
              </div>
              <div className="tiny dim" style={{ marginTop: 3 }}>
                {t('roleImmutable')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card pad="lg">
        <form className="stack" onSubmit={save}>
          <div className="section-title">{t('editProfile')}</div>

          {error ? (
            <Banner tone="bad" icon={<AlertTriangle size={17} />}>
              {error}
            </Banner>
          ) : null}

          <Field label={t('fullNameLabel')} htmlFor="me-name">
            <input
              id="me-name"
              className="input"
              value={fullName}
              maxLength={80}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label={t('usernameLabel')} htmlFor="me-username" hint="a-z, 0-9, _">
            <input
              id="me-username"
              className="input"
              value={username}
              maxLength={24}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            />
          </Field>

          <Field label={t('bioLabel')} optional htmlFor="me-bio">
            <textarea
              id="me-bio"
              className="textarea"
              maxLength={600}
              placeholder={t('bioPlaceholder')}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </Field>

          <Field
            label={t('phoneLabel')}
            optional
            htmlFor="me-phone"
            hint={t('contactLocked')}
          >
            <div className="input-group">
              <span className="lead">
                <Phone size={16} />
              </span>
              <input
                id="me-phone"
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </Field>

          <div className="grid-2">
            <Field label={t('cityLabel')} optional htmlFor="me-city">
              <div className="input-group">
                <span className="lead">
                  <MapPin size={16} />
                </span>
                <input
                  id="me-city"
                  className="input"
                  list="me-cities"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <datalist id="me-cities">
                  {CITIES.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            </Field>

            <Field label={t('areaLabel')} optional htmlFor="me-area">
              <input
                id="me-area"
                className="input"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </Field>

            {isWorker ? (
              <Field label={t('rateLabel')} optional htmlFor="me-rate" hint={t('perHour')}>
                <div className="input-group">
                  <span className="lead">
                    <IndianRupee size={16} />
                  </span>
                  <input
                    id="me-rate"
                    className="input"
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </div>
              </Field>
            ) : null}
          </div>

          <Field label={t('societyLabel')} optional htmlFor="me-society">
            <input
              id="me-society"
              className="input"
              value={society}
              onChange={(e) => setSociety(e.target.value)}
            />
          </Field>

          <Field label={t('mediaLabel')} optional htmlFor="me-avatar" hint="https://…">
            <div className="input-group">
              <span className="lead">
                <Link2 size={16} />
              </span>
              <input
                id="me-avatar"
                className="input"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
              />
            </div>
          </Field>

          {isWorker ? (
            <Field label={t('skillsLabel')} hint={`${skills.length}/6`}>
              <div className="row-wrap">
                {CATEGORIES.map((entry) => (
                  <Chip
                    key={entry.id}
                    on={skills.includes(entry.id)}
                    onClick={() => toggleSkill(entry.id)}
                    type="button"
                  >
                    {t(categoryKey(entry.id))}
                  </Chip>
                ))}
              </div>
            </Field>
          ) : null}

          <Button type="submit" variant="primary" size="lg" block loading={busy}>
            {t('save')}
          </Button>
        </form>
      </Card>

      <Card pad="lg">
        <div className="section-title">{t('appearance')}</div>
        <div className="row" style={{ gap: 8 }}>
          <LanguagePicker />
          <ThemeToggle />
          <span className="small muted">
            {t('language')} · {t('appearance')}
          </span>
        </div>

        <hr style={{ margin: '16px 0' }} />

        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <ShieldCheck size={16} style={{ color: 'var(--ok)' }} />
          <span className="small muted">
            {isWorker && profile.hourly_rate ? `${rupees(profile.hourly_rate)} ${t('perHour')} · ` : ''}
            LokaSetu v{VERSION}
          </span>
        </div>

        <Button
          variant="danger"
          block
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
        >
          <LogOut size={16} />
          {t('signOut')}
        </Button>
      </Card>
    </div>
  );
}

export default function MePage() {
  return (
    <AppShell>
      <Guard>
        <MyProfile />
      </Guard>
    </AppShell>
  );
}
