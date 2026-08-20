import { redirect } from 'next/navigation';
import { getServerUser } from '@/utils/supabase/server';
import { Landing } from '@/components/landing';

/**
 * The front door.
 *
 * This is a Server Component: it reads the session from the request cookies
 * (which the middleware keeps fresh) and sends a signed-in visitor straight to
 * the feed, so nobody who is already in has to look at a marketing page.
 *
 * `force-dynamic` because the answer depends on a cookie. `getServerUser`
 * never throws — an unconfigured or unreachable Supabase means "signed out",
 * which is exactly what a build machine with no environment variables should
 * conclude.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getServerUser();
  if (user) redirect('/feed');
  return <Landing />;
}
