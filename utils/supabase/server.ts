/**
 * The server client, for Server Components, Route Handlers and Server Actions.
 *
 * It reads the session out of the request cookies, so a server render knows who
 * is signed in without a round trip to the browser.
 *
 * `cookies()` is async in Next.js 15, hence the await.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

export async function createClient() {
  const store = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          /* Called from a Server Component, where cookies are read-only.
             The middleware refreshes the session instead, so this is safe to
             ignore — it is the pattern Supabase documents for exactly this. */
        }
      },
    },
  });
}

export interface ServerUser {
  id: string;
  email: string | null;
}

/**
 * Who is signed in, from the server's point of view — or null.
 *
 * Never throws. A build that runs before the environment variables exist, a
 * network blip, an expired token: all of them mean "nobody is signed in", not
 * "crash the page".
 */
export async function getServerUser(): Promise<ServerUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
