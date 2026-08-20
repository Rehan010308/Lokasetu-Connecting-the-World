'use client';

import React from 'react';
import { VERSION } from '@/lib/version';

/**
 * GLOBAL error boundary — the root layout's own net.
 *
 * app/error.tsx catches errors thrown inside a ROUTE. It cannot catch errors
 * thrown by the root layout or the providers it mounts, because those sit
 * above it in the tree. When one of those throws, Next.js shows its built-in
 * fallback — the notoriously unhelpful:
 *
 *     "Application error: a client-side exception has occurred
 *      (see the browser console for more information)"
 *
 * which hides the message behind a console most people will never open, and
 * gives whoever is debugging nothing to work from.
 *
 * This replaces that fallback with the actual error, the build it happened on,
 * and the one action that fixes the most common cause. It must render without
 * the providers — so no store, no theme, no i18n, and its own <html> and
 * <body>, which Next requires of a global-error boundary.
 */
export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  const [copied, setCopied] = React.useState(false);

  const report = [
    `LokaSetu v${VERSION}`,
    error?.digest ? `digest: ${error.digest}` : null,
    `message: ${error?.message ?? 'none'}`,
    error?.stack ? `stack:\n${error.stack.split('\n').slice(0, 12).join('\n')}` : null,
  ].filter(Boolean).join('\n');

  function clearAndRestart() {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith('lokasetu:'))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch { /* private mode; the reload is still worth trying */ }
    window.location.href = '/';
  }

  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center',
        padding: '32px 20px', background: '#F4F7FA', color: '#0F1720',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}>
        <main style={{ maxWidth: 560, width: '100%' }}>
          <p style={{ fontSize: 52, margin: 0 }} aria-hidden>🔌</p>
          <h1 style={{ fontSize: 28, margin: '10px 0 0', letterSpacing: '-0.02em' }}>
            Something broke
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.55, color: '#4A5A70', marginTop: 10 }}>
            Most often this is data saved by an earlier version of the app.
            Clearing it costs nothing — the demo rebuilds itself.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
            <button onClick={clearAndRestart} style={btn(true)}>
              ♻️ Clear saved data and restart
            </button>
            <button onClick={reset} style={btn(false)}>Try again</button>
          </div>

          {/* The whole point: the message, on screen, copyable. */}
          <pre style={{
            marginTop: 26, padding: 16, borderRadius: 14, overflowX: 'auto',
            background: '#fff', border: '1px solid #DCE4EC', fontSize: 12.5,
            lineHeight: 1.5, color: '#2A3547', whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>{report}</pre>

          <button
            onClick={() => { navigator.clipboard?.writeText(report); setCopied(true); }}
            style={{ ...btn(false), marginTop: 10 }}
          >
            {copied ? '✓ Copied' : '📋 Copy this error'}
          </button>
        </main>
      </body>
    </html>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    minHeight: 48, padding: '0 20px', borderRadius: 14, cursor: 'pointer',
    fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
    border: primary ? 'none' : '1px solid #DCE4EC',
    background: primary ? '#059669' : '#fff',
    color: primary ? '#fff' : '#2A3547',
  };
}
