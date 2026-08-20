'use client';

/**
 * The two demo accounts.
 *
 * These are deliberately public credentials for a public demo. They are not a
 * secret and they are not a back door: they sign in through the same
 * `signInWithPassword` call as anybody else, and they are bound by exactly the
 * same Row Level Security policies. Deleting this file removes the buttons and
 * nothing else.
 *
 * The quick-login button is self-healing. It tries to sign in; if the account
 * does not exist yet in *your* Supabase project, it creates it and signs in.
 * That is why the demo works on a database you provisioned five minutes ago,
 * with no seeding step and no SQL to paste.
 */

import { createPost, getProfileByUsername, listPosts, signIn, signUp, updateProfile, createOffer, listMyOffers, savePrivateDetails } from './queries';
import type { Profile } from './model';
import {
  DEMO_ACCOUNTS,
  demoAccountFor,
  isDemoUsername,
  type DemoAccount,
} from './demo-accounts';

export { DEMO_ACCOUNTS, type DemoAccount };

export function isDemoProfile(profile: Profile | null | undefined): boolean {
  return isDemoUsername(profile?.username);
}

/**
 * Sign in as a demo account, creating it first if this project has never seen
 * it. Returns an error string only when both paths failed.
 */
export async function quickLogin(account: DemoAccount): Promise<string | null> {
  const first = await signIn(account.email, account.password);
  if (!first.error) return null;

  // Anything other than "no such account" is a real problem worth surfacing.
  if (!/do not match an account|Invalid login/i.test(first.error)) return first.error;

  const created = await signUp({
    email: account.email,
    password: account.password,
    fullName: account.fullName,
    role: account.role,
    location: account.location,
    username: account.username,
  });
  if (created.error) return created.error;

  const second = await signIn(account.email, account.password);
  if (second.error) {
    return created.data.needsConfirmation
      ? 'The demo account was created but Supabase is asking for email confirmation. Open Authentication → Sign In / Providers → Email and turn "Confirm email" off, then press the button again.'
      : second.error;
  }
  return null;
}

/* ----------------------------------------------------------- demo content */

const EMPLOYER_POSTS = [
  {
    title: 'Switchboard sparking in the kitchen',
    content:
      'Second-floor flat, Koramangala 5th Block. The kitchen switchboard sparks when the mixer and the kettle run together. Needs looking at today if possible — I can be home after 6pm.',
    category: 'electrical',
    budget: 1200,
  },
  {
    title: 'Deep clean before tenants move in',
    content:
      'Two-bedroom flat, empty, needs a full deep clean: bathrooms, kitchen chimney, balcony grills, windows inside and out. Roughly 900 sq ft. Saturday or Sunday.',
    category: 'cleaning',
    budget: 3500,
  },
  {
    title: 'Bathroom tap dripping for a week',
    content:
      'The hot water tap in the main bathroom drips constantly and the washer looks worn. Small job, but I would rather it was done properly than taped over.',
    category: 'plumbing',
    budget: 600,
  },
];

const WORKER_POSTS = [
  {
    title: 'Free Thursday and Friday this week',
    content:
      'Electrical work anywhere around Koramangala, HSR or Indiranagar. Switchboards, new points, fan and light installs, inverter wiring. I bring my own tools and give you the price before I start.',
    category: 'electrical',
    budget: null as number | null,
  },
  {
    title: 'Finished a full rewiring in HSR Layout',
    content:
      'Three days, two-bedroom flat, all old aluminium wiring replaced with copper. Owner wanted every point tested in front of him, which is the right way to do it.',
    category: 'electrical',
    budget: null as number | null,
  },
];

/**
 * Give a freshly created demo account something to look at.
 *
 * Runs once per account: if the account already has posts, it does nothing. It
 * only ever writes rows owned by the signed-in demo user, so Row Level Security
 * is satisfied without any special privilege.
 */
export async function seedDemoContent(profile: Profile): Promise<void> {
  if (!isDemoProfile(profile)) return;

  const account = demoAccountFor(profile.username);
  if (!account) return;

  // Fill in the parts of the profile the sign-up trigger could not know.
  if (!profile.bio || (account.skills.length && profile.skills.length === 0)) {
    await updateProfile(profile.id, {
      bio: profile.bio || account.bio,
      location: profile.location || account.location,
      skills: profile.skills.length ? profile.skills : account.skills,
      hourly_rate: profile.hourly_rate ?? account.hourlyRate,
      city: profile.city ?? 'Bengaluru',
      area: profile.area ?? 'Koramangala',
      society: profile.society ?? (profile.role === 'employer' ? 'Green Valley Apartments' : null),
    });
  }

  // A demo phone number, so the contact reveal has something to reveal once an
  // offer is accepted. It goes to `private_details`, not to the profile.
  await savePrivateDetails({
    owner_id: profile.id,
    post_id: null,
    phone: profile.role === 'employer' ? '+919845012345' : '+919845067890',
  });

  const existing = await listPosts({ authorId: profile.id, limit: 1 });
  if (existing.error || existing.data.length > 0) return;

  if (profile.role === 'employer') {
    for (const post of EMPLOYER_POSTS) {
      const created = await createPost({
        user_id: profile.id,
        post_type: 'job',
        title: post.title,
        content: post.content,
        category: post.category,
        budget: post.budget,
        location: account.location,
      });
      if (created.data) {
        await savePrivateDetails({
          owner_id: profile.id,
          post_id: created.data.id,
          flat_number: 'B-402',
          landmark: 'opposite the Jyoti Nivas college gate',
          notes: 'Lift is on the left. Ring the bell twice, it sticks.',
        });
      }
    }
    await seedOpeningOffer(profile);
  } else {
    for (const post of WORKER_POSTS) {
      await createPost({
        user_id: profile.id,
        post_type: 'update',
        title: post.title,
        content: post.content,
        category: post.category,
        budget: post.budget,
        location: account.location,
      });
    }
  }
}

/**
 * Put one live negotiation on the board, so the Offers screen has something in
 * it the first time either demo account opens it.
 */
async function seedOpeningOffer(employer: Profile): Promise<void> {
  const worker = await getProfileByUsername('lokasetu_worker');
  if (worker.error || !worker.data) return;

  const existing = await listMyOffers(employer.id);
  if (existing.error || existing.data.length > 0) return;

  const posts = await listPosts({ authorId: employer.id, category: 'electrical', limit: 1 });
  const post = posts.data[0] ?? null;

  await createOffer({
    post_id: post ? post.id : null,
    employer_id: employer.id,
    worker_id: worker.data.id,
    offered_price: 900,
    message: 'Can you do it for this? It is a single switchboard, should not take long.',
  });
}
