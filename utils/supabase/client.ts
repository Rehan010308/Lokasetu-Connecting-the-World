'use client';

/**
 * The browser client.
 *
 * `createBrowserClient` from `@supabase/ssr` keeps the session in cookies
 * rather than localStorage, which is what lets the server components and the
 * middleware in this app see the same session the browser has.
 *
 * One instance per tab. Creating a second one gives you two auth listeners
 * fighting over the same cookie, which shows up later as a session that
 * randomly drops.
 */

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let instance: BrowserClient | null = null;

export function createClient(): BrowserClient {
  if (!instance) {
    instance = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return instance;
}

/** Alias used across the app, because `supabase()` reads better at call sites. */
export const supabase = createClient;
