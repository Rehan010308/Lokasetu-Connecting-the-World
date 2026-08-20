/**
 * The database, in TypeScript.
 *
 * One column here for one column in `supabase/schema.sql`, same names, same
 * nullability. Nothing in this file is inferred or generated — it is written by
 * hand so that a mismatch between the app and the database is a compile error
 * rather than a runtime surprise, and so that it keeps working when a future
 * version of the Supabase client changes how generated types are shaped.
 *
 * If you change a column in the SQL, change it here in the same commit.
 */

/* ------------------------------------------------------------------ enums */

/** Chosen once at sign-up. A database trigger makes it immutable after that. */
export type Role = 'worker' | 'employer';

/** A post is either a piece of work someone wants done, or an update. */
export type PostType = 'job' | 'update';

export type PostStatus = 'open' | 'assigned' | 'completed' | 'cancelled';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

/** The negotiation state machine. `countered` means the ball is in the other court. */
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'countered';

export const ROLES: readonly Role[] = ['worker', 'employer'] as const;
export const POST_TYPES: readonly PostType[] = ['job', 'update'] as const;
export const POST_STATUSES: readonly PostStatus[] = ['open', 'assigned', 'completed', 'cancelled'] as const;
export const CONNECTION_STATUSES: readonly ConnectionStatus[] = ['pending', 'accepted', 'rejected', 'blocked'] as const;
export const OFFER_STATUSES: readonly OfferStatus[] = ['pending', 'accepted', 'declined', 'countered'] as const;

/* ------------------------------------------------------------------- rows */

/** `public.profiles` */
export interface ProfileRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  role: Role;
  skills: string[];
  hourly_rate: number | null;
  verified: boolean;
  /* Locality-level address. Safe to show before a booking is accepted —
     this is the "area only" the spec asks for. */
  city: string | null;
  area: string | null;
  society: string | null;
  preferred_language: string;
}

/**
 * `public.private_details` — the phone number and the exact address.
 *
 * Deliberately NOT columns on `profiles`. Row Level Security is per row, not
 * per column, and `profiles` has to be world-readable because it is the
 * directory of who does what work. A phone column there would be readable by
 * anyone holding the anon key regardless of what the UI renders.
 *
 *   post_id === null  -> this person's own contact details
 *   post_id !== null  -> the exact address for one specific job
 */
export interface PrivateDetailsRow {
  id: number;
  owner_id: string;
  post_id: number | null;
  phone: string | null;
  flat_number: string | null;
  landmark: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** `public.posts` */
export interface PostRow {
  id: number;
  created_at: string;
  user_id: string;
  content: string;
  media_url: string | null;
  title: string | null;
  category: string | null;
  budget: number | null;
  location: string | null;
  post_type: PostType;
  status: PostStatus;
}

/** `public.connections` */
export interface ConnectionRow {
  id: number;
  created_at: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
}

/** `public.offers` */
export interface OfferRow {
  id: number;
  created_at: string;
  updated_at: string;
  post_id: number | null;
  employer_id: string;
  worker_id: string;
  offered_price: number;
  status: OfferStatus;
  message: string | null;
  round: number;
  last_actor: string | null;
}

/* ------------------------------------------------------------ table names */

/** Every table name the app uses, in one place, so a typo cannot hide. */
export const TABLE = {
  profiles: 'profiles',
  posts: 'posts',
  connections: 'connections',
  offers: 'offers',
  privateDetails: 'private_details',
} as const;

/* ------------------------------------------------ what we ask PostgREST for */

/**
 * Embedded selects.
 *
 * `offers` and `connections` each hold two foreign keys to `profiles`, so the
 * relationship has to be named explicitly — PostgREST cannot guess which one
 * you mean and returns an error if you make it try. The names below are the
 * constraint names Postgres generates for the schema in `supabase/schema.sql`.
 */
export const PROFILE_FIELDS =
  'id, created_at, updated_at, username, full_name, avatar_url, bio, location, role, skills, hourly_rate, verified, city, area, society, preferred_language';

export const POST_SELECT =
  `id, created_at, user_id, content, media_url, title, category, budget, location, post_type, status, author:profiles(${PROFILE_FIELDS})`;

export const OFFER_SELECT =
  `id, created_at, updated_at, post_id, employer_id, worker_id, offered_price, status, message, round, last_actor,` +
  ` employer:profiles!offers_employer_id_fkey(${PROFILE_FIELDS}),` +
  ` worker:profiles!offers_worker_id_fkey(${PROFILE_FIELDS}),` +
  ` post:posts(id, title, content, category, budget, post_type, status)`;

export const CONNECTION_SELECT =
  `id, created_at, requester_id, receiver_id, status,` +
  ` requester:profiles!connections_requester_id_fkey(${PROFILE_FIELDS}),` +
  ` receiver:profiles!connections_receiver_id_fkey(${PROFILE_FIELDS})`;

export const PRIVATE_FIELDS =
  'id, owner_id, post_id, phone, flat_number, landmark, notes, created_at, updated_at';
