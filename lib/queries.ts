'use client';

/**
 * Every read and write in the application.
 *
 * Two rules hold everywhere in this file:
 *
 *   1. Nothing throws. Every function returns `{ data, error }` where `error`
 *      is a sentence a person can read. A dropped network connection is a
 *      message on screen, never a white page.
 *
 *   2. Rows are normalised on the way out (see `lib/model.ts`), so components
 *      receive one predictable shape and never have to know that PostgREST
 *      returns an embedded relationship as an object sometimes and a
 *      one-element array other times.
 *
 * Authorisation is not implemented here. It lives in the Row Level Security
 * policies and triggers in `supabase/schema.sql`, because a rule that only
 * exists in the client is a rule anybody can skip with curl.
 */

import { supabase } from '@/utils/supabase/client';
import { describeError } from './errors';
import { isSupabaseConfigured, SETUP_HINT } from '@/utils/supabase/config';
import {
  CONNECTION_SELECT,
  OFFER_SELECT,
  POST_SELECT,
  PROFILE_FIELDS,
  TABLE,
  type ConnectionStatus,
  type PostStatus,
  type PostType,
  type Role,
} from './database.types';
import {
  compact,
  normalizeConnection,
  normalizeOffer,
  normalizePost,
  normalizeProfile,
  type Connection,
  type Offer,
  type Post,
  type Profile,
} from './model';

export interface Result<T> {
  data: T;
  error: string | null;
}

const ok = <T>(data: T): Result<T> => ({ data, error: null });
const fail = <T>(data: T, error: string): Result<T> => ({ data, error });

/* ------------------------------------------------------- error translation */

export { describeError } from './errors';

function notConfigured<T>(empty: T): Result<T> {
  return fail(empty, `Supabase is not connected. ${SETUP_HINT}`);
}

/* ================================================================== auth == */

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  location?: string;
  username?: string;
}

export async function signUp(input: SignUpInput): Promise<Result<{ needsConfirmation: boolean }>> {
  if (!isSupabaseConfigured()) return notConfigured({ needsConfirmation: false });
  try {
    const { data, error } = await supabase().auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        // Read by the `handle_new_user` trigger to build the profile row.
        // The role is honoured once, here, and frozen by the database after
        // that — there is no path from the UI to change it later.
        data: {
          full_name: input.fullName.trim(),
          role: input.role,
          location: input.location?.trim() ?? '',
          username: input.username?.trim() ?? '',
        },
      },
    });
    if (error) return fail({ needsConfirmation: false }, describeError(error));
    return ok({ needsConfirmation: !data.session });
  } catch (e) {
    return fail({ needsConfirmation: false }, describeError(e));
  }
}

export async function signIn(email: string, password: string): Promise<Result<boolean>> {
  if (!isSupabaseConfigured()) return notConfigured(false);
  try {
    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return fail(false, describeError(error));
    return ok(true);
  } catch (e) {
    return fail(false, describeError(e));
  }
}

export async function signOut(): Promise<Result<boolean>> {
  if (!isSupabaseConfigured()) return ok(true);
  try {
    const { error } = await supabase().auth.signOut();
    if (error) return fail(false, describeError(error));
    return ok(true);
  } catch (e) {
    return fail(false, describeError(e));
  }
}

/* ============================================================== profiles == */

export async function getProfile(id: string): Promise<Result<Profile | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  try {
    const { data, error } = await supabase()
      .from(TABLE.profiles)
      .select(PROFILE_FIELDS)
      .eq('id', id)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizeProfile(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

export async function getProfileByUsername(username: string): Promise<Result<Profile | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  try {
    const { data, error } = await supabase()
      .from(TABLE.profiles)
      .select(PROFILE_FIELDS)
      .eq('username', username)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizeProfile(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

export interface ProfileFilter {
  role?: Role;
  search?: string;
  location?: string;
  skill?: string;
  excludeId?: string;
  limit?: number;
}

export async function listProfiles(filter: ProfileFilter = {}): Promise<Result<Profile[]>> {
  if (!isSupabaseConfigured()) return notConfigured([]);
  try {
    let query = supabase()
      .from(TABLE.profiles)
      .select(PROFILE_FIELDS)
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filter.limit ?? 50);

    if (filter.role) query = query.eq('role', filter.role);
    if (filter.location) query = query.ilike('location', `%${filter.location}%`);
    if (filter.skill) query = query.contains('skills', [filter.skill]);
    if (filter.excludeId) query = query.neq('id', filter.excludeId);
    if (filter.search) {
      const term = filter.search.replace(/[,()]/g, ' ').trim();
      if (term) query = query.or(`full_name.ilike.%${term}%,username.ilike.%${term}%,bio.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) return fail([], describeError(error));
    return ok(compact((data ?? []).map(normalizeProfile)));
  } catch (e) {
    return fail([], describeError(e));
  }
}

export interface ProfilePatch {
  full_name?: string;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  username?: string;
  skills?: string[];
  hourly_rate?: number | null;
}

/**
 * Note what is absent: `role`. It is not in `ProfilePatch`, it is not sent, and
 * if it were sent the `freeze_profile_role` trigger would reject the whole
 * update. Three layers, on purpose.
 */
export async function updateProfile(id: string, patch: ProfilePatch): Promise<Result<Profile | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  try {
    const { data, error } = await supabase()
      .from(TABLE.profiles)
      .update(patch)
      .eq('id', id)
      .select(PROFILE_FIELDS)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizeProfile(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

/**
 * Make sure the signed-in user has a profile row.
 *
 * The `handle_new_user` trigger creates one at sign-up, so this normally finds
 * it on the first try. It matters for accounts that existed before the schema
 * was applied, which would otherwise be signed in with nothing to show.
 */
export async function ensureProfile(
  userId: string,
  meta: { email?: string | null; full_name?: string | null; role?: Role; location?: string | null },
): Promise<Result<Profile | null>> {
  const existing = await getProfile(userId);
  if (existing.data || existing.error) return existing;

  const base = (meta.email ?? 'member').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'member';
  try {
    const { data, error } = await supabase()
      .from(TABLE.profiles)
      .insert({
        id: userId,
        username: `${base}${userId.replace(/-/g, '').slice(0, 4)}`,
        full_name: meta.full_name || base,
        role: meta.role ?? 'worker',
        location: meta.location ?? null,
      })
      .select(PROFILE_FIELDS)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizeProfile(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

/* ================================================================= posts == */

export interface PostFilter {
  type?: PostType;
  category?: string;
  authorId?: string;
  status?: PostStatus;
  search?: string;
  limit?: number;
}

export async function listPosts(filter: PostFilter = {}): Promise<Result<Post[]>> {
  if (!isSupabaseConfigured()) return notConfigured([]);
  try {
    let query = supabase()
      .from(TABLE.posts)
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(filter.limit ?? 40);

    if (filter.type) query = query.eq('post_type', filter.type);
    if (filter.category) query = query.eq('category', filter.category);
    if (filter.authorId) query = query.eq('user_id', filter.authorId);
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.search) {
      const term = filter.search.replace(/[,()]/g, ' ').trim();
      if (term) query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%,location.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) return fail([], describeError(error));
    return ok(compact((data ?? []).map(normalizePost)));
  } catch (e) {
    return fail([], describeError(e));
  }
}

export async function getPost(id: number): Promise<Result<Post | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  try {
    const { data, error } = await supabase()
      .from(TABLE.posts)
      .select(POST_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizePost(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

export interface NewPost {
  user_id: string;
  content: string;
  title?: string | null;
  category?: string | null;
  budget?: number | null;
  location?: string | null;
  media_url?: string | null;
  post_type: PostType;
}

export async function createPost(input: NewPost): Promise<Result<Post | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  const content = input.content.trim();
  if (!content) return fail(null, 'Write something first.');
  try {
    const { data, error } = await supabase()
      .from(TABLE.posts)
      .insert({
        user_id: input.user_id,
        content,
        title: input.title?.trim() || null,
        category: input.category || null,
        budget: input.budget ?? null,
        location: input.location?.trim() || null,
        media_url: input.media_url?.trim() || null,
        post_type: input.post_type,
        status: 'open',
      })
      .select(POST_SELECT)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizePost(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

export async function deletePost(id: number): Promise<Result<boolean>> {
  if (!isSupabaseConfigured()) return notConfigured(false);
  try {
    const { error } = await supabase().from(TABLE.posts).delete().eq('id', id);
    if (error) return fail(false, describeError(error));
    return ok(true);
  } catch (e) {
    return fail(false, describeError(e));
  }
}

export async function setPostStatus(id: number, status: PostStatus): Promise<Result<boolean>> {
  if (!isSupabaseConfigured()) return notConfigured(false);
  try {
    const { error } = await supabase().from(TABLE.posts).update({ status }).eq('id', id);
    if (error) return fail(false, describeError(error));
    return ok(true);
  } catch (e) {
    return fail(false, describeError(e));
  }
}

/* =========================================================== connections == */

export async function listConnections(meId: string): Promise<Result<Connection[]>> {
  if (!isSupabaseConfigured()) return notConfigured([]);
  try {
    const { data, error } = await supabase()
      .from(TABLE.connections)
      .select(CONNECTION_SELECT)
      .or(`requester_id.eq.${meId},receiver_id.eq.${meId}`)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return fail([], describeError(error));
    return ok(compact((data ?? []).map(normalizeConnection)));
  } catch (e) {
    return fail([], describeError(e));
  }
}

export async function requestConnection(meId: string, otherId: string): Promise<Result<Connection | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  if (meId === otherId) return fail(null, 'You cannot connect with yourself.');
  try {
    const { data, error } = await supabase()
      .from(TABLE.connections)
      .insert({ requester_id: meId, receiver_id: otherId, status: 'pending' })
      .select(CONNECTION_SELECT)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizeConnection(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

export async function respondToConnection(
  id: number,
  status: Extract<ConnectionStatus, 'accepted' | 'rejected' | 'blocked'>,
): Promise<Result<Connection | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  try {
    const { data, error } = await supabase()
      .from(TABLE.connections)
      .update({ status })
      .eq('id', id)
      .select(CONNECTION_SELECT)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizeConnection(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

export async function removeConnection(id: number): Promise<Result<boolean>> {
  if (!isSupabaseConfigured()) return notConfigured(false);
  try {
    const { error } = await supabase().from(TABLE.connections).delete().eq('id', id);
    if (error) return fail(false, describeError(error));
    return ok(true);
  } catch (e) {
    return fail(false, describeError(e));
  }
}

/* ================================================================ offers == */

export async function listMyOffers(meId: string): Promise<Result<Offer[]>> {
  if (!isSupabaseConfigured()) return notConfigured([]);
  try {
    const { data, error } = await supabase()
      .from(TABLE.offers)
      .select(OFFER_SELECT)
      .or(`employer_id.eq.${meId},worker_id.eq.${meId}`)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) return fail([], describeError(error));
    return ok(compact((data ?? []).map(normalizeOffer)));
  } catch (e) {
    return fail([], describeError(e));
  }
}

export async function listOffersForPost(postId: number): Promise<Result<Offer[]>> {
  if (!isSupabaseConfigured()) return notConfigured([]);
  try {
    const { data, error } = await supabase()
      .from(TABLE.offers)
      .select(OFFER_SELECT)
      .eq('post_id', postId)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) return fail([], describeError(error));
    return ok(compact((data ?? []).map(normalizeOffer)));
  } catch (e) {
    return fail([], describeError(e));
  }
}

export interface NewOffer {
  post_id: number | null;
  employer_id: string;
  worker_id: string;
  offered_price: number;
  message?: string | null;
}

export async function createOffer(input: NewOffer): Promise<Result<Offer | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  if (!(input.offered_price > 0)) return fail(null, 'Enter an amount greater than zero.');
  if (input.employer_id === input.worker_id) return fail(null, 'You cannot make an offer to yourself.');
  try {
    const { data, error } = await supabase()
      .from(TABLE.offers)
      .insert({
        post_id: input.post_id,
        employer_id: input.employer_id,
        worker_id: input.worker_id,
        offered_price: Math.round(input.offered_price * 100) / 100,
        message: input.message?.trim() || null,
        status: 'pending',
      })
      .select(OFFER_SELECT)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    return ok(normalizeOffer(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

async function patchOffer(id: number, patch: Record<string, unknown>): Promise<Result<Offer | null>> {
  if (!isSupabaseConfigured()) return notConfigured(null);
  try {
    const { data, error } = await supabase()
      .from(TABLE.offers)
      .update(patch)
      .eq('id', id)
      .select(OFFER_SELECT)
      .maybeSingle();
    if (error) return fail(null, describeError(error));
    if (!data) return fail(null, 'That offer is no longer available.');
    return ok(normalizeOffer(data));
  } catch (e) {
    return fail(null, describeError(e));
  }
}

export const acceptOffer = (id: number) => patchOffer(id, { status: 'accepted' });
export const declineOffer = (id: number) => patchOffer(id, { status: 'declined' });

/**
 * A counter-offer is one row, updated. The database stamps who moved
 * (`last_actor`) and bumps `round`, which is what stops either side from
 * naming a price and accepting it in the same breath.
 */
export function counterOffer(id: number, price: number, message?: string | null) {
  return patchOffer(id, {
    status: 'countered',
    offered_price: Math.round(price * 100) / 100,
    message: message?.trim() || null,
  });
}

export async function withdrawOffer(id: number): Promise<Result<boolean>> {
  if (!isSupabaseConfigured()) return notConfigured(false);
  try {
    const { error } = await supabase().from(TABLE.offers).delete().eq('id', id);
    if (error) return fail(false, describeError(error));
    return ok(true);
  } catch (e) {
    return fail(false, describeError(e));
  }
}

/* ============================================================== realtime == */

export type RealtimeTable = 'posts' | 'offers' | 'connections' | 'profiles';

/**
 * Live updates. Returns an unsubscribe function, always — including when
 * Supabase is not configured, so callers never need to null-check it in a
 * cleanup path.
 */
export function subscribe(tables: RealtimeTable[], onChange: (table: RealtimeTable) => void): () => void {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return () => {};
  try {
    const client = supabase();
    const channel = client.channel(`lokasetu:${tables.join('-')}:${Math.floor(Math.random() * 1e6)}`);
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(table));
    }
    channel.subscribe();
    return () => {
      try {
        client.removeChannel(channel);
      } catch {
        /* the channel was already gone */
      }
    };
  } catch {
    return () => {};
  }
}
