'use client';

import React from 'react';
import { useT } from '@/components/store';
import { Shell, TopBar } from '@/components/ui';

/**
 * Printable onboarding poster. Stick it on a notice board; a worker scans it
 * and lands directly on the sign-up flow — no app store, no typing a URL.
 *
 * The QR image comes from a free public generator so the project stays
 * dependency-free. To render it locally instead, `npm i qrcode` and swap the
 * <img> for a canvas.
 */
export default function QrPage() {
  const { t } = useT();
  const [origin, setOrigin] = React.useState('');

  React.useEffect(() => setOrigin(window.location.origin), []);

  const joinUrl = origin ? `${origin}/join` : '';
  const src = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=8&data=${encodeURIComponent(joinUrl)}`
    : '';

  return (
    <Shell>
      <TopBar title={t('qr.title')} back="/" />
      <div className="page stack">
        <p className="sub no-print">{t('qr.sub')}</p>

        <div className="card center">
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.5px' }}>काम मिलेगा, पास में ही</div>
          <div className="muted" style={{ marginBottom: 14 }}>Work near you · வேலை · పని · ജോലി · ಕೆಲಸ</div>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Scan to register on KaamSetu" width={280} height={280} style={{ maxWidth: '100%' }} />
          ) : (
            <div style={{ height: 280 }} />
          )}
          <div className="bold" style={{ marginTop: 12, fontSize: 18 }}>📷 Scan to register — free</div>
          <div className="tiny" style={{ marginTop: 6, wordBreak: 'break-all' }}>{joinUrl}</div>
          <div className="tiny" style={{ marginTop: 10 }}>
            Electrician · Plumber · Carpenter · Painter · House help · Cook · Barber · Scrap collector
          </div>
        </div>

        <button className="btn no-print" onClick={() => window.print()}>🖨️ {t('qr.print')}</button>
      </div>
    </Shell>
  );
}
