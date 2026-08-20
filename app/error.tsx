'use client';

import { useEffect } from 'react';

/**
 * The route-level error boundary.
 *
 * It prints the real message rather than "an error occurred", because an
 * error you cannot read is an error you cannot fix.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[lokasetu]', error);
  }, [error]);

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Something broke
        </div>
        <h1 style={{ marginBottom: 10 }}>This screen failed to render</h1>
        <div className="panel" style={{ marginBottom: 18 }}>
          <code style={{ fontSize: '0.84rem', wordBreak: 'break-word' }}>
            {error?.message || 'No message was attached to the error.'}
          </code>
          {error?.digest ? (
            <div className="tiny dim" style={{ marginTop: 8 }}>
              digest: {error.digest}
            </div>
          ) : null}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={reset}>
            Try again
          </button>
          <a className="btn" href="/feed">
            Back to the feed
          </a>
        </div>
      </div>
    </main>
  );
}
