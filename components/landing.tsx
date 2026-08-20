'use client';

import React from 'react';
import Link from 'next/link';
import { Brandmark, LanguagePicker, ThemeToggle } from './shell';
import { Button } from './ui';
import { useLang } from './providers';
import { ArrowRight, ArrowLeftRight, Globe, Users } from './icons';
import { VERSION } from '@/lib/version';

export function Landing() {
  const { t } = useLang();

  const features = [
    { Icon: ArrowLeftRight, title: t('feat1Title'), body: t('feat1Body') },
    { Icon: Users, title: t('feat2Title'), body: t('feat2Body') },
    { Icon: Globe, title: t('feat3Title'), body: t('feat3Body') },
  ];

  return (
    <div className="main" style={{ minHeight: '100dvh' }}>
      <header className="topbar">
        <Brandmark />
        <div className="topbar-actions">
          <LanguagePicker />
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm" variant="soft">
              {t('signIn')}
            </Button>
          </Link>
        </div>
      </header>

      <main className="page wide" style={{ paddingBottom: 64 }}>
        <section className="hero">
          <span className="badge brand" style={{ marginBottom: 16 }}>
            {t('tagline')}
          </span>
          <h1 className="display">
            {t('heroTitle').split('.').map((part, i, all) =>
              part.trim() ? (
                <span key={i} className={i === all.length - 2 ? 'gradient-text' : undefined}>
                  {part.trim()}.{' '}
                </span>
              ) : null,
            )}
          </h1>
          <p className="lede">{t('heroSubtitle')}</p>

          <div className="hero-cta">
            <Link href="/login">
              <Button variant="primary" size="lg">
                {t('heroCtaPrimary')}
                <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/login?demo=1">
              <Button size="lg">{t('heroCtaSecondary')}</Button>
            </Link>
          </div>
        </section>

        <section className="grid-3" style={{ marginTop: 8 }}>
          {features.map((feature) => (
            <div className="feature" key={feature.title}>
              <div className="feature-ico">
                <feature.Icon size={20} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </div>
          ))}
        </section>

        <footer className="row" style={{ justifyContent: 'center', marginTop: 48 }}>
          <span className="tiny dim">LokaSetu v{VERSION}</span>
        </footer>
      </main>
    </div>
  );
}
