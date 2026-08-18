'use client';

import Link from 'next/link';
import { LANGUAGES } from '@/lib/i18n';
import { useActions, useT, useStore } from '@/components/store';
import { Shell } from '@/components/ui';

export default function Home() {
  const { t, lang } = useT();
  const { setLang, reset } = useActions();
  const { db } = useStore();

  return (
    <Shell>
      <header className="topbar">
        <div className="brandmark">क</div>
        <div className="grow">
          <h1>{t('app.name')}</h1>
          <p className="sub">{t('app.tagline')}</p>
        </div>
      </header>

      <div className="page stack-lg" style={{ paddingBottom: 32 }}>
        <div>
          <h3 className="title">🌐 {t('home.lang')}</h3>
          <div className="chips" style={{ marginTop: 10 }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`chip${l.code === lang ? ' on' : ''}`}
                onClick={() => setLang(l.code)}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="title">{t('home.chooseRole')}</h2>
        </div>

        <Link href="/worker/onboarding" className="card tap" style={{ display: 'block' }}>
          <div className="row" style={{ gap: 14 }}>
            <div style={{ fontSize: 40 }}>🧰</div>
            <div className="grow">
              <div className="bold" style={{ fontSize: 19 }}>{t('home.iWorker')}</div>
              <div className="muted">{t('home.iWorkerDesc')}</div>
            </div>
            <div style={{ fontSize: 24, color: 'var(--brand)' }}>›</div>
          </div>
        </Link>

        <Link href="/resident/login" className="card tap" style={{ display: 'block' }}>
          <div className="row" style={{ gap: 14 }}>
            <div style={{ fontSize: 40 }}>🏠</div>
            <div className="grow">
              <div className="bold" style={{ fontSize: 19 }}>{t('home.iResident')}</div>
              <div className="muted">{t('home.iResidentDesc')}</div>
            </div>
            <div style={{ fontSize: 24, color: 'var(--brand)' }}>›</div>
          </div>
        </Link>

        <div className="grid2">
          <Link href="/scrap" className="stat tap">
            <div style={{ fontSize: 26 }}>♻️</div>
            <div className="l" style={{ marginTop: 4 }}>{t('home.scrap')}</div>
          </Link>
          <Link href="/insights" className="stat tap">
            <div style={{ fontSize: 26 }}>📊</div>
            <div className="l" style={{ marginTop: 4 }}>{t('home.insights')}</div>
          </Link>
        </div>

        <div className="card flat">
          <div className="row-between">
            <div>
              <div className="bold">{db.workers.length} workers · {db.jobs.length} jobs</div>
              <div className="tiny">Demo data lives in this browser only.</div>
            </div>
            <button className="btn sm secondary" onClick={reset}>Reset demo</button>
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <Link href="/qr" className="tiny bold" style={{ color: 'var(--brand)' }}>
            📱 {t('qr.title')} →
          </Link>
        </div>
      </div>
    </Shell>
  );
}
