/**
 * Postgres speaks in codes. People do not.
 *
 * Kept in its own module, with no imports, so the test suite can assert the
 * translations without pulling in the Supabase client — and so that the
 * mapping is one obvious place to add to when a new failure shows up in
 * practice.
 *
 * Messages raised by the triggers in `supabase/schema.sql` are already written
 * for a person, so those are passed through rather than replaced.
 */
export function describeError(error: any): string {
  if (!error) return 'Something went wrong.';

  const code = String(error.code ?? '');
  const message = String(error.message ?? '');

  if (code === '23505' || message.includes('duplicate key')) {
    if (message.includes('unique_connection')) return 'You have already sent this person a request.';
    if (message.includes('profiles_username_key')) return 'That username is taken. Try another.';
    return 'That already exists.';
  }
  if (code === '23503') return 'That referred to something which no longer exists.';
  if (code === '23514') return 'The database rejected those values as out of range.';
  if (code === '42501' || code === 'P0001') {
    return message.replace(/^.*?:\s*/, '') || 'You are not allowed to do that.';
  }
  if (code === '42P01') {
    return 'The database tables are missing. Run supabase/schema.sql in the Supabase SQL editor.';
  }
  if (code === '42703' || /column .* does not exist/i.test(message)) {
    // The four base tables exist but the additive columns do not, which means
    // schema.sql was never applied to this project.
    return 'The database is missing a column this app needs. Run supabase/schema.sql in the Supabase SQL editor.';
  }
  if (code === 'PGRST116') return 'Not found.';
  if (code === 'PGRST301' || message.includes('JWT')) return 'Your session expired. Sign in again.';

  if (message.includes('Invalid login credentials')) {
    return 'That email and password do not match an account.';
  }
  if (message.includes('Email not confirmed')) {
    return 'This account still needs email confirmation. In Supabase, open Authentication → Sign In / Providers → Email and turn "Confirm email" off, then try again.';
  }
  if (message.includes('User already registered')) {
    return 'An account with that email already exists. Sign in instead.';
  }
  if (message.includes('Password should be')) return 'Password must be at least 6 characters.';
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('fetch failed')
  ) {
    return 'Could not reach Supabase. Check your connection and that NEXT_PUBLIC_SUPABASE_URL is correct.';
  }

  return message || 'Something went wrong.';
}
