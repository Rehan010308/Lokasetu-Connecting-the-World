import Link from 'next/link';

/**
 * 404.
 *
 * A SERVER component on purpose — no hooks, no store, no providers doing work.
 *
 * Without this file Next.js generates its own /_not-found and prerenders it
 * through the root layout, which drags every client provider into the build.
 * That is the route the production build died on: a page nobody asked for,
 * failing on data it never needed. An explicit, dependency-free 404 makes that
 * route trivially prerenderable.
 */
export default function NotFound() {
  return (
    <div className="shell">
      <main className="page" style={{ paddingTop: 120, textAlign: 'center' }}>
        <p style={{ fontSize: 54, marginBottom: 8 }} aria-hidden>🧭</p>
        <h1 className="t-h1">Page not found</h1>
        <p className="t-sm" style={{ margin: '10px auto 26px', maxWidth: 340 }}>
          That link does not lead anywhere. The work is back this way.
        </p>
        <Link href="/" className="btn" style={{ maxWidth: 280, margin: '0 auto' }}>
          Go home
        </Link>
      </main>
    </div>
  );
}
