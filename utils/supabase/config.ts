/**
 * The only place the two Supabase values are read.
 *
 * SECURITY
 * --------
 * Both values below are public by design and safe to ship to a browser:
 *
 *   NEXT_PUBLIC_SUPABASE_URL       the address of your project
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  a JWT that says "anonymous visitor"
 *
 * The anon key grants nothing on its own. Every table has Row Level Security
 * on, so what a request can actually do is decided by the policies in
 * `supabase/schema.sql` against `auth.uid()`.
 *
 * The `service_role` key is a different thing entirely: it bypasses Row Level
 * Security completely. It is never read in this file, never read anywhere else
 * in this repository, and must never be given a NEXT_PUBLIC_ prefix.
 *
 * WHY THE FALLBACKS
 * -----------------
 * `createBrowserClient` throws if it is handed an empty URL. During
 * `next build`, pages are rendered on a machine that may not have the
 * environment variables yet — and a throw there fails the whole deploy with an
 * error that says nothing about the real cause. These placeholders keep the
 * build alive; `isSupabaseConfigured()` is how the app knows to show a setup
 * notice instead of pretending to work.
 */

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'anon-key-not-configured';

/**
 * Written as direct property access on purpose: Next.js inlines
 * `process.env.NEXT_PUBLIC_*` at build time only when it can see the literal
 * property name. A computed lookup silently becomes `undefined` in the browser.
 */
export const SUPABASE_URL: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;

export const SUPABASE_ANON_KEY: string =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

/** True when both variables are present and look like the real thing. */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL !== PLACEHOLDER_URL &&
    SUPABASE_ANON_KEY !== PLACEHOLDER_KEY &&
    SUPABASE_URL.startsWith('http') &&
    SUPABASE_ANON_KEY.length > 20
  );
}

/** What to tell a developer who has not finished step 5 of the README. */
export const SETUP_HINT =
  'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example), then restart the dev server.';
