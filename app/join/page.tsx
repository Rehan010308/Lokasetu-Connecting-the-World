'use client';

import Link from 'next/link';
import { LANGUAGES } from '@/lib/i18n';
import { useActions, useT } from '@/components/store';
import { GlassCard, Stagger, StaggerItem } from '@/components/aurora';
import { HeaderTools, Shell, TopBar } from '@/components/kit';

/**
 * The QR landing page. Printed posters point here, so a worker scans once and
 * is one tap from registering — no app store, no typing a web address.
 */
export default function Join() {
  const { t, lang } = useT();
  const { setLang } = useActions();

  return (
    <Shell>
      <TopBar title={t('app.name')} subtitle={t('app.tagline')} right={<HeaderTools />} />
      <main className="page v-6" style={{ paddingTop: 4 }}>
        <p className="note em">📷 QR scanned — welcome</p>

        <div>
          <h1 className="t-h1">{t('o.lang')}</h1>
          <p className="t-sm" style={{ marginTop: 6 }}>{t('o.langSub')}</p>
        </div>

        <Stagger className="v-3" gap={0.04}>
          {LANGUAGES.map((l) => (
            <StaggerItem key={l.code}>
              <button className={`choice${l.code === lang ? ' on' : ''}`} onClick={() => setLang(l.code)}>
                <span className="lead" aria-hidden>🗣️</span>
                <span><span className="ttl">{l.native}</span><br /><span className="sub">{l.label}</span></span>
                {l.code === lang ? <span className="mark">✓</span> : null}
              </button>
            </StaggerItem>
          ))}
        </Stagger>

        <Link href="/worker/onboarding" className="btn">🧰 {t('a.worker')} →</Link>
        <Link href="/login" className="btn ghost">🏠 {t('a.customer')}</Link>
      </main>
    </Shell>
  );
}
