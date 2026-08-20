'use client';

/**
 * The last boundary. If the root layout itself throws, this replaces the whole
 * document — which is why it renders its own <html> and <body> and uses inline
 * styles: at this point the stylesheet may not have loaded either.
 *
 * It shows the message and the stack, because "Application error: a client-side
 * exception has occurred" is not information.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const detail = [error?.message, error?.digest ? `digest: ${error.digest}` : '', error?.stack]
    .filter(Boolean)
    .join('\n\n');

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#f5f6fb',
          color: '#101728',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ maxWidth: 620, width: '100%' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>LokaSetu could not start</h1>
          <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: 15 }}>
            The exact error is below. Copy it if you need to report it.
          </p>
          <pre
            style={{
              background: '#fff',
              border: '1px solid #e2e6f0',
              borderRadius: 12,
              padding: 14,
              fontSize: 12.5,
              lineHeight: 1.55,
              overflow: 'auto',
              maxHeight: 320,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {detail || 'No details were attached to the error.'}
          </pre>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              height: 44,
              padding: '0 20px',
              borderRadius: 10,
              border: 0,
              background: '#4f46e5',
              color: '#fff',
              fontWeight: 650,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
