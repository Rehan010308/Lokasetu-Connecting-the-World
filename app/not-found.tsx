import Link from 'next/link';

/**
 * A Server Component with no providers, no hooks and no imports beyond Link.
 *
 * 404 is the one page that has to render when everything else has failed, so
 * it depends on nothing. This is also the page a Next.js production build
 * prerenders first, which is why it is deliberately inert.
 */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          404
        </div>
        <h1 style={{ marginBottom: 8 }}>That page does not exist</h1>
        <p className="lede" style={{ marginBottom: 22 }}>
          The link may be old, or the post may have been deleted.
        </p>
        <Link href="/feed" className="btn primary">
          Back to the feed
        </Link>
      </div>
    </main>
  );
}
