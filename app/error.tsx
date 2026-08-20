'use client';

import React from 'react';
import { VERSION } from '@/lib/version';

/**
 * Route error boundary.
 *
 * Without this, any exception thrown while rendering shows the visitor a blank
 * white page and puts the real message in a console they will never open. On a
 * demo that judges click through, a white screen is indistinguishable from a
 * broken product.
 *
 * So: say what happened, name the build it happened on, and offer the one
 * action that fixes the most common cause — stored data written by an older
 * version of the app being read by a newer one.
 */
export default function ErrorBoundary({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  const [cleared, setCleared] = React.useState(false);

  function clearAndReload() {
    try {
      for (const k of Object.keys(window.localStorage)) {
        if (k.startsWith('lokasetu:')) window.localStorage.removeItem(k);
      }
    } catch { /* private mode — the reload is still worth trying */ }
    setCleared(true);
    window.location.href = '/';
  }

  return (
    <div className="shell">
      <main className="page" style={{ paddingTop: 100, textAlign: 'center' }}>
        <p style={{ fontSize: 52, marginBottom: 6 }} aria-hidden>🔌</p>
        <h1 className="t-h1">Something broke</h1>
        <p className="t-sm" style={{ margin: '10px auto 0', maxWidth: 380 }}>
          Most often this is old data saved by a previous version of the app.
          Clearing it fixes it and costs nothing — the demo data rebuilds itself.
        </p>

        <div className="v-3" style={{ maxWidth: 320, margin: '26px auto 0' }}>
          <button className="btn" onClick={clearAndReload} disabled={cleared}>
            ♻️ Clear saved data and restart
          </button>
          <button className="btn ghost" onClick={reset}>Try again</button>
        </div>

        <details className="glass flat pad-s" style={{ maxWidth: 420, margin: '28px auto 0', textAlign: 'left' }}>
          <summary className="t-xs strong" style={{ cursor: 'pointer' }}>Technical details</summary>
          <p className="t-micro" style={{ marginTop: 10, wordBreak: 'break-word' }}>
            v{VERSION}{error?.digest ? ` · ${error.digest}` : ''}
          </p>
          <p className="t-xs" style={{ marginTop: 6, wordBreak: 'break-word' }}>
            {error?.message ?? 'No message'}
          </p>
        </details>
      </main>
    </div>
  );
}
