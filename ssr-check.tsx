/**
 * SERVER-RENDER SMOKE TEST — npm run ssr
 *
 * Reproduces what a Vercel build does: renders every route to static markup on
 * a server, with no browser present. This is the exact operation a failing
 * deploy reports as "Export encountered an error on /<route>".
 *
 * It exists because a prerender crash is invisible until you deploy. A route
 * that works perfectly in `npm run dev` — where everything renders in a browser
 * with a real window, real localStorage and a live session — can still fail the
 * production build.
 *
 * Every route is rendered twice: once inside the app's providers (the real
 * arrangement) and once bare (which catches a component that silently depends
 * on a context it never declared).
 *
 * NOTE: needs local stand-ins for next/*, @supabase/* and lucide-react, since
 * those cannot be resolved outside a Next runtime. They live in node_modules
 * and are gitignored — this script is for the sandbox, not for CI.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Providers } from '@/components/providers';

type Loader = () => Promise<any>;

const ROUTES: [string, Loader, any][] = [
  ['/', () => import('@/app/page'), {}],
  ['/login', () => import('@/app/login/page'), {}],
  ['/feed', () => import('@/app/feed/page'), {}],
  ['/network', () => import('@/app/network/page'), {}],
  ['/offers', () => import('@/app/offers/page'), {}],
  ['/earnings', () => import('@/app/earnings/page'), {}],
  ['/me', () => import('@/app/me/page'), {}],
  ['/post/new', () => import('@/app/post/new/page'), {}],
  ['/post/[id]', () => import('@/app/post/[id]/page'), {}],
  ['/profile/[username]', () => import('@/app/profile/[username]/page'), {}],
  ['/_not-found', () => import('@/app/not-found'), {}],
  ['/_error', () => import('@/app/error'), { error: new Error('smoke test'), reset: () => {} }],
  ['/_global-error', () => import('@/app/global-error'), { error: new Error('smoke test'), reset: () => {} }],
];

async function renderRoute(load: Loader, props: any, wrapped: boolean): Promise<string> {
  const mod = await load();
  const Page = mod.default;

  // A Server Component may be async: calling it returns a promise of an
  // element, which has to be awaited before it can be rendered.
  let element: any = React.createElement(Page, props);
  const maybe = Page.constructor && Page.constructor.name === 'AsyncFunction' ? Page(props) : null;
  if (maybe && typeof maybe.then === 'function') element = await maybe;

  const tree = wrapped ? React.createElement(Providers, null, element) : element;
  return renderToStaticMarkup(tree);
}

async function main() {
  let failed = 0;
  console.log('\n  server-rendering every route\n');

  for (const [name, load, props] of ROUTES) {
    const marks: string[] = [];

    for (const wrapped of [true, false]) {
      const label = wrapped ? 'with providers' : 'bare';
      try {
        const html = await renderRoute(load, props, wrapped);
        if (typeof html !== 'string') throw new Error('did not return markup');
        if (html.length < 20) throw new Error(`rendered only ${html.length} characters`);
        marks.push(`${label} ok`);
      } catch (e: any) {
        // A redirect is a successful outcome for a route whose job is to
        // redirect, not a crash.
        if (String(e?.message).includes('NEXT_REDIRECT')) {
          marks.push(`${label} redirect`);
          continue;
        }
        failed += 1;
        marks.push(`${label} FAILED`);
        console.log(`  ❌ ${name.padEnd(22)} [${label}] ${String(e?.message).split('\n')[0]}`);
        if (process.env.TRACE) console.log(String(e?.stack).split('\n').slice(1, 8).join('\n'));
      }
    }

    if (!marks.some((m) => m.includes('FAILED'))) {
      console.log(`  ✅ ${name.padEnd(22)} ${marks.join(' · ')}`);
    }
  }

  console.log(
    failed
      ? `\n  ${failed} render(s) failed\n`
      : '\n  ✅ every route renders on the server without throwing\n',
  );
  process.exit(failed ? 1 : 0);
}

void main();
