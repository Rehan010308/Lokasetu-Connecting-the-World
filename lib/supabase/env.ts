/**
 * Is Supabase configured?
 *
 * The whole integration hangs off this one question, and it is asked at
 * runtime rather than assumed at build time. If the answer is no — no project
 * yet, env vars not set on Vercel, a preview deploy without secrets — the app
 * falls back to localStorage and behaves exactly as it did before Supabase
 * existed.
 *
 * That is deliberate. A migration that can take the whole site down when one
 * environment variable is missing is a worse product than the thing it
 * replaced, and "it worked locally" is how that gets discovered in public.
 *
 * NEXT_PUBLIC_ prefixed values are compiled into the browser bundle. That is
 * correct and expected for these two — the anon key is designed to be public
 * and is only as powerful as your Row Level Security lets it be.
 *
 * The SERVICE ROLE key is NOT read here and must never be. It bypasses RLS
 * entirely. It belongs in server-only code, never in anything the browser
 * downloads.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_URL.includes('.supabase.co') &&
    SUPABASE_ANON_KEY.length > 40
  );
}

/** For the diagnostics panel — never prints the key itself. */
export function supabaseStatus(): { configured: boolean; project: string | null } {
  if (!isSupabaseConfigured()) return { configured: false, project: null };
  const project = SUPABASE_URL.replace('https://', '').split('.')[0];
  return { configured: true, project };
}
