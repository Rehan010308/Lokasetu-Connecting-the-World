/**
 * Session refresh, on every request.
 *
 * A Supabase access token lasts an hour. Without this, a person who leaves the
 * tab open comes back to a page that thinks they are signed out. The middleware
 * refreshes the token and writes the new cookies onto the response, so both the
 * browser and the next server render see a live session.
 *
 * It never redirects and never blocks. Route protection is done in the pages,
 * where there is enough context to send someone somewhere useful.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  try {
    const client = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          for (const { name, value } of list) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Touching getUser() is what triggers the refresh. Do not remove it.
    await client.auth.getUser();
  } catch {
    /* An unreachable Supabase must not take the whole site down. */
  }

  return response;
}
