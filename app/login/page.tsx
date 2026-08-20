'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brandmark, LanguagePicker, ThemeToggle } from '@/components/shell';
import { Banner, Button, Card, Field } from '@/components/ui';
import { SetupNotice } from '@/components/guard';
import { useAuth, useLang, useToast } from '@/components/providers';
import { AlertTriangle, ArrowRight, Briefcase, Lock, Mail, User, Wrench } from '@/components/icons';
import { signIn, signUp } from '@/lib/queries';
import { DEMO_ACCOUNTS, quickLogin, type DemoAccount } from '@/lib/demo';
import { isEmail } from '@/lib/format';
import { CITIES } from '@/lib/catalog';
import { vars } from '@/lib/style';
import type { Role } from '@/lib/database.types';

type Mode = 'signin' | 'signup';

function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLang();
  const { status, configured } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [society, setSociety] = useState('');
  const [role, setRole] = useState<Role>('worker');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'form' | string | null>(null);

  // Already signed in? There is nothing to do on this screen.
  useEffect(() => {
    if (status === 'signedIn') router.replace('/feed');
  }, [status, router]);

  const highlightDemo = params?.get('demo') === '1';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!isEmail(email)) {
      setError(t('emailLabel'));
      return;
    }
    if (password.length < 6) {
      setError(t('passwordHint'));
      return;
    }
    if (mode === 'signup' && fullName.trim().length < 2) {
      setError(t('fullNameLabel'));
      return;
    }

    setBusy('form');

    if (mode === 'signin') {
      const result = await signIn(email, password);
      setBusy(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace('/feed');
      return;
    }

    const created = await signUp({
      email,
      password,
      fullName,
      role,
      location: [area, city].filter(Boolean).join(', ') || city,
      city,
      area,
      society,
    });
    if (created.error) {
      setBusy(null);
      setError(created.error);
      return;
    }

    if (created.data.needsConfirmation) {
      setBusy(null);
      setNotice(t('checkEmail'));
      setMode('signin');
      return;
    }

    setBusy(null);
    router.replace('/feed');
  }

  async function demo(account: DemoAccount) {
    setError(null);
    setNotice(null);
    setBusy(account.email);
    const failure = await quickLogin(account);
    setBusy(null);
    if (failure) {
      setError(failure);
      return;
    }
    toast(`${account.fullName} · ${account.role === 'worker' ? t('roleWorker') : t('roleEmployer')}`, 'ok');
    router.replace('/feed');
  }

  return (
    <div className="main">
      <header className="topbar">
        <Link href="/" aria-label="LokaSetu">
          <Brandmark />
        </Link>
        <div className="topbar-actions">
          <LanguagePicker />
          <ThemeToggle />
        </div>
      </header>

      <main className="page narrow">
        <SetupNotice />

        <div className="page-head" style={{ textAlign: 'center' }}>
          <h1>{mode === 'signin' ? t('authSignInTitle') : t('authSignUpTitle')}</h1>
          <p className="lede">{mode === 'signin' ? t('authSignInSub') : t('authSignUpSub')}</p>
        </div>

        {/* ---------------------------------------------- demo accounts -- */}
        <Card
          pad="lg"
          className={highlightDemo ? 'accent' : ''}
          style={{ marginBottom: 18 }}
        >
          <div className="section-title" style={{ marginBottom: 4 }}>
            {t('demoTitle')}
          </div>
          <p className="small muted" style={{ marginBottom: 14 }}>
            {t('demoSub')}
          </p>

          <div className="grid-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="pick-option"
                disabled={busy !== null || !configured}
                onClick={() => demo(account)}
                style={{ cursor: busy ? 'wait' : 'pointer' }}
              >
                <div className="row" style={{ gap: 9, marginBottom: 6 }}>
                  <span
                    className="cat-ico"
                    style={vars({ '--hue': account.role === 'worker' ? 38 : 221 })}
                  >
                    {account.role === 'worker' ? <Wrench size={16} /> : <Briefcase size={16} />}
                  </span>
                  <span className="pick-title">
                    {account.role === 'worker' ? t('demoWorker') : t('demoEmployer')}
                  </span>
                </div>
                <div className="pick-body">
                  {account.fullName}
                  <br />
                  <code style={{ fontSize: '0.72rem', opacity: 0.8 }}>{account.email}</code>
                </div>
                {busy === account.email ? (
                  <div className="tiny" style={{ marginTop: 8 }}>
                    {t('loading')}…
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          <p className="tiny dim" style={{ marginTop: 12 }}>
            {DEMO_ACCOUNTS[0].password} — the same password for both. These are public demo
            credentials, bound by the same security policies as any other account.
          </p>
        </Card>

        {/* ------------------------------------------------ email + pass -- */}
        <Card pad="lg">
          <form className="stack" onSubmit={submit}>
            {notice ? (
              <Banner tone="ok" title={t('saved')}>
                {notice}
              </Banner>
            ) : null}

            {error ? (
              <Banner tone="bad" icon={<AlertTriangle size={17} />}>
                {error}
              </Banner>
            ) : null}

            {mode === 'signup' ? (
              <>
                <Field label={t('chooseRole')} hint={t('roleImmutable')}>
                  <div className="pick">
                    <button
                      type="button"
                      className="pick-option"
                      data-on={role === 'worker'}
                      onClick={() => setRole('worker')}
                    >
                      <div className="pick-title">{t('roleWorker')}</div>
                      <div className="pick-body">{t('roleWorkerHint')}</div>
                    </button>
                    <button
                      type="button"
                      className="pick-option"
                      data-on={role === 'employer'}
                      onClick={() => setRole('employer')}
                    >
                      <div className="pick-title">{t('roleEmployer')}</div>
                      <div className="pick-body">{t('roleEmployerHint')}</div>
                    </button>
                  </div>
                </Field>

                <Field label={t('fullNameLabel')} htmlFor="name">
                  <div className="input-group">
                    <span className="lead">
                      <User size={16} />
                    </span>
                    <input
                      id="name"
                      className="input"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </Field>

                {/* Asked once, here. The job composer never asks for a city
                    again — it reads these three back off the profile. */}
                <div className="grid-2">
                  <Field label={t('cityLabel')} optional htmlFor="city">
                    <input
                      id="city"
                      className="input"
                      list="lokasetu-cities"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                    <datalist id="lokasetu-cities">
                      {CITIES.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </Field>

                  <Field label={t('areaLabel')} optional htmlFor="area">
                    <input
                      id="area"
                      className="input"
                      autoComplete="address-level3"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                  </Field>
                </div>

                <Field label={t('societyLabel')} optional htmlFor="society">
                  <input
                    id="society"
                    className="input"
                    value={society}
                    onChange={(e) => setSociety(e.target.value)}
                  />
                </Field>
              </>
            ) : null}

            <Field label={t('emailLabel')} htmlFor="email">
              <div className="input-group">
                <span className="lead">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>

            <Field label={t('passwordLabel')} hint={t('passwordHint')} htmlFor="password">
              <div className="input-group">
                <span className="lead">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </Field>

            <Button type="submit" variant="primary" size="lg" block loading={busy === 'form'}>
              {mode === 'signin' ? t('signIn') : t('createAccount')}
              <ArrowRight size={17} />
            </Button>

            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setNotice(null);
              }}
            >
              {mode === 'signin' ? t('noAccount') : t('haveAccount')}
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}

/**
 * `useSearchParams` makes a page dynamic; the Suspense boundary is what keeps
 * the production build from failing with "useSearchParams should be wrapped in
 * a suspense boundary". It is not optional in the App Router.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page narrow" style={{ paddingTop: 80 }} />}>
      <LoginScreen />
    </Suspense>
  );
}
