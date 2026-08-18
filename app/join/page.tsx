'use client';

import Link from 'next/link';
import { LANGUAGES } from '@/lib/i18n';
import { useActions, useT } from '@/components/store';
import { Shell } from '@/components/ui';

/**
 * The QR-code landing page. Posters printed from /qr point here, so a worker
 * scans once and is one tap from registering - no app store, no search.
 */
export default function Join() {
  const { t, lang } = useT();
  const { setLang } = useActions();

  return (
    <Shell>
      <header className="topbar">
        <div className="brandmark">क</div>
        <div className="grow">
          <h1>{t('app.name')}</h1>
          <p className="sub">{t('app.tagline')}</p>
        </div>
      </header>

      <div className="page stack-lg">
        <div className="banner">📷 QR scanned — welcome!</div>

        <div>
          <h2 className="title">{t('home.lang')}</h2>
          <div className="stack" style={{ marginTop: 10 }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`opt${l.code === lang ? ' selected' : ''}`}
                onClick={() => setLang(l.code)}
              >
                <span className="emoji">🗣️</span>
                <span>
                  <span className="t">{l.native}</span>
                  <br />
                  <span className="d">{l.label}</span>
                </span>
                {l.code === lang ? <span className="check">✓</span> : null}
              </button>
            ))}
          </div>
        </div>

        <Link href="/worker/onboarding" className="btn">
          {t('home.iWorker')} →
        </Link>
        <Link href="/resident/login" className="btn secondary">
          {t('home.iResident')}
        </Link>
      </div>
    </Shell>
  );
}
