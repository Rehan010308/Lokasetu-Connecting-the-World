'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * One browser client, created lazily.
 *
 * Lazily because importing this module must never be what breaks a page.
 * Creating the client at module scope would run during SSR and during the
 * bundle's evaluation, which is exactly the kind of "runs before anything can
 * catch it" code that has already cost this project a production outage.
 *
 * Returns null when Supabase is not configured. Every caller handles null by
 * falling back to local storage — there is no code path where a missing
 * environment variable becomes an exception.
 */
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
    return client;
  } catch {
    /* A malformed URL should degrade to local mode, not white-screen. */
    return null;
  }
}
