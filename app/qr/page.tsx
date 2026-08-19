'use client';

import React from 'react';
import { useT } from '@/components/store';
import { GlassCard } from '@/components/aurora';
import { HeaderTools, Shell, TopBar } from '@/components/kit';

/**
 * A printable poster. Stick it on a notice board and a worker scans straight
 * into the sign-up flow.
 *
 * The QR image comes from a free public generator so the project has no extra
 * dependency. To render it locally instead: `npm i qrcode` and draw to canvas.
 */
export default function QrPage() {
  const { t } = useT();
  const [href, setHref] = React.useState('');

  React.useEffect(() => setHref(`${window.location.origin}/join`), []);
  const src = href
    ? `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=8&data=${encodeURIComponent(href)}`
    : '';

  return (
    <Shell>
      <TopBar back="/" title="QR" right={<HeaderTools />} />
      <main className="page v-4" style={{ paddingTop: 4 }}>
        <GlassCard className="pad-l mid">
          <div className="t-h1">काम मिलेगा, पास में ही</div>
          <p className="t-xs" style={{ marginTop: 6 }}>
            வேலை · పని · ಕೆಲಸ · ജോലി · काम · কাজ · કામ · ਕੰਮ
          </p>
          <div style={{ margin: '20px 0' }}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="Scan to register" width={280} height={280} style={{ maxWidth: '100%', borderRadius: 12, background: '#fff', padding: 8 }} />
            ) : <div style={{ height: 280 }} />}
          </div>
          <div className="t-h3">📷 {t('a.worker')} — free</div>
          <p className="t-xs" style={{ marginTop: 8, wordBreak: 'break-all' }}>{href}</p>
          <p className="t-xs" style={{ marginTop: 12 }}>{t('a.workerD')}</p>
        </GlassCard>
        <button className="btn no-print" onClick={() => window.print()}>🖨️ Print</button>
      </main>
    </Shell>
  );
}
