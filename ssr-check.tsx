/**
 * SERVER-RENDER SMOKE TEST  —  npm run ssr
 *
 * Reproduces what Vercel does at build time: renders every route to static
 * markup on the server, with no browser present. This is the exact operation a
 * failing deploy reports as "Export encountered an error on /<route>".
 *
 * It exists because a prerender crash is invisible until you deploy. A route
 * that works perfectly in `npm run dev` — where everything renders in a browser
 * with a real window and real localStorage — can still fail the production
 * build, because the build renders it on a server where none of that exists.
 *
 * Proven to catch the real thing: reintroducing `db.workers[0].geo` (an index
 * into an array that is empty on the server) fails 8 routes here, with the same
 * message the deploy gives.
 *
 * NOTE: needs local stand-ins for next/* and motion/react, since those cannot
 * be resolved outside a Next runtime. They live in node_modules and are
 * gitignored — this script is for the sandbox, not for CI.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreProvider } from '@/components/store';
import { ThemeProvider } from '@/components/theme';

const ROUTES: [string, () => Promise<any>][] = [
  ['/',                  () => import('@/app/page')],
  ['/login',             () => import('@/app/login/page')],
  ['/join',              () => import('@/app/join/page')],
  ['/search',            () => import('@/app/search/page')],
  ['/jobs',              () => import('@/app/jobs/page')],
  ['/job/[id]',          () => import('@/app/job/[id]/page')],
  ['/worker/[id]',       () => import('@/app/worker/[id]/page')],
  ['/worker/onboarding', () => import('@/app/worker/onboarding/page')],
  ['/me',                () => import('@/app/me/page')],
  ['/book',              () => import('@/app/book/page')],
  ['/hire',              () => import('@/app/hire/page')],
  ['/verify',            () => import('@/app/verify/page')],
  ['/trust',             () => import('@/app/trust/page')],
  ['/earnings',          () => import('@/app/earnings/page')],
  ['/qr',                () => import('@/app/qr/page')],
  ['/_not-found',        () => import('@/app/not-found')],
];

async function main() {
let failed = 0;
for (const [name, load] of ROUTES) {
  try {
    const mod = await load();
    const Page = mod.default;
    const html = renderToStaticMarkup(
      React.createElement(ThemeProvider, null,
        React.createElement(StoreProvider, null,
          React.createElement(Page)))
    );
    if (!html || html.length < 20) throw new Error(`rendered only ${html.length} chars`);
    console.log(`  ✅ ${name.padEnd(20)} ${String(html.length).padStart(6)} chars`);
  } catch (e: any) {
    failed++;
    console.log(`  ❌ ${name.padEnd(20)} ${e?.message?.split('\n')[0]}`);
    if (process.env.TRACE) console.log(e.stack?.split('\n').slice(0, 6).join('\n'));
  }
}
console.log(failed ? `\n${failed} route(s) fail to prerender` : '\n✅ every route prerenders on the server without throwing');
process.exit(failed ? 1 : 0);
}
main();
