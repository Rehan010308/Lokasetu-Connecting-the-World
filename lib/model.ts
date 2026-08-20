/**
 * The domain layer: shapes the UI actually renders, and the rules that decide
 * what a person is allowed to do next.
 *
 * Everything here is pure. No network, no React, no browser. That is what lets
 * `npm test` assert the negotiation rules directly instead of clicking through
 * them, and it is why the same rules can be checked in the database (see the
 * triggers in `supabase/schema.sql`) without the two drifting apart.
 */

import type {
  PrivateDetailsRow,
  ConnectionRow,
  ConnectionStatus,
  OfferRow,
  OfferStatus,
  PostRow,
  ProfileRow,
  Role,
} from './database.types';

/* --------------------------------------------------------- joined shapes */

export type Profile = ProfileRow;

export interface Post extends PostRow {
  author: Profile | null;
}

export interface Offer extends OfferRow {
  employer: Profile | null;
  worker: Profile | null;
  post: Pick<PostRow, 'id' | 'title' | 'content' | 'category' | 'budget' | 'post_type' | 'status'> | null;
}

export interface Connection extends ConnectionRow {
  requester: Profile | null;
  receiver: Profile | null;
}

/* ------------------------------------------------------------ normalizing */

/**
 * PostgREST hands back `numeric` columns as JSON numbers, and embedded
 * one-to-one relationships as either an object or a one-element array
 * depending on how it resolved the relationship. Both are flattened here, once,
 * so no component ever has to ask which shape it got.
 */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value ?? null;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeProfile(raw: any): Profile | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    created_at: raw.created_at ?? raw.updated_at ?? new Date(0).toISOString(),
    updated_at: raw.updated_at ?? null,
    username: raw.username ?? null,
    full_name: raw.full_name ?? null,
    avatar_url: raw.avatar_url ?? null,
    bio: raw.bio ?? null,
    location: raw.location ?? null,
    role: (raw.role === 'employer' ? 'employer' : 'worker') as Role,
    skills: Array.isArray(raw.skills) ? raw.skills.filter((s: unknown) => typeof s === 'string') : [],
    hourly_rate: num(raw.hourly_rate),
    verified: Boolean(raw.verified),
    city: raw.city ?? null,
    area: raw.area ?? null,
    society: raw.society ?? null,
    preferred_language: typeof raw.preferred_language === 'string' ? raw.preferred_language : 'en',
  };
}

export function normalizePrivateDetails(raw: any): PrivateDetailsRow | null {
  if (!raw || raw.id === undefined || raw.id === null) return null;
  return {
    id: Number(raw.id),
    owner_id: String(raw.owner_id ?? ''),
    post_id: raw.post_id === null || raw.post_id === undefined ? null : Number(raw.post_id),
    phone: raw.phone ?? null,
    flat_number: raw.flat_number ?? null,
    landmark: raw.landmark ?? null,
    notes: raw.notes ?? null,
    created_at: raw.created_at ?? new Date(0).toISOString(),
    updated_at: raw.updated_at ?? raw.created_at ?? new Date(0).toISOString(),
  };
}

export function normalizePost(raw: any): Post | null {
  if (!raw || raw.id === undefined || raw.id === null) return null;
  return {
    id: Number(raw.id),
    created_at: raw.created_at ?? new Date(0).toISOString(),
    user_id: String(raw.user_id ?? ''),
    content: String(raw.content ?? ''),
    media_url: raw.media_url ?? null,
    title: raw.title ?? null,
    category: raw.category ?? null,
    budget: num(raw.budget),
    location: raw.location ?? null,
    post_type: raw.post_type === 'update' ? 'update' : 'job',
    status: (['open', 'assigned', 'completed', 'cancelled'].includes(raw.status) ? raw.status : 'open') as Post['status'],
    author: normalizeProfile(one(raw.author)),
  };
}

export function normalizeOffer(raw: any): Offer | null {
  if (!raw || raw.id === undefined || raw.id === null) return null;
  const post = one<any>(raw.post);
  return {
    id: Number(raw.id),
    created_at: raw.created_at ?? new Date(0).toISOString(),
    updated_at: raw.updated_at ?? raw.created_at ?? new Date(0).toISOString(),
    post_id: raw.post_id === null || raw.post_id === undefined ? null : Number(raw.post_id),
    employer_id: String(raw.employer_id ?? ''),
    worker_id: String(raw.worker_id ?? ''),
    offered_price: num(raw.offered_price) ?? 0,
    status: (['pending', 'accepted', 'declined', 'countered'].includes(raw.status) ? raw.status : 'pending') as OfferStatus,
    message: raw.message ?? null,
    round: Number(raw.round ?? 1),
    last_actor: raw.last_actor ?? null,
    employer: normalizeProfile(one(raw.employer)),
    worker: normalizeProfile(one(raw.worker)),
    post: post
      ? {
          id: Number(post.id),
          title: post.title ?? null,
          content: String(post.content ?? ''),
          category: post.category ?? null,
          budget: num(post.budget),
          post_type: post.post_type === 'update' ? 'update' : 'job',
          status: post.status ?? 'open',
        }
      : null,
  };
}

export function normalizeConnection(raw: any): Connection | null {
  if (!raw || raw.id === undefined || raw.id === null) return null;
  return {
    id: Number(raw.id),
    created_at: raw.created_at ?? new Date(0).toISOString(),
    requester_id: String(raw.requester_id ?? ''),
    receiver_id: String(raw.receiver_id ?? ''),
    status: (['pending', 'accepted', 'rejected', 'blocked'].includes(raw.status) ? raw.status : 'pending') as ConnectionStatus,
    requester: normalizeProfile(one(raw.requester)),
    receiver: normalizeProfile(one(raw.receiver)),
  };
}

/** Drop the nulls a normalizer produced for rows that were malformed. */
export function compact<T>(rows: (T | null)[]): T[] {
  return rows.filter((r): r is T => r !== null);
}

/* --------------------------------------------------- the negotiation rules */

export interface OfferPermissions {
  /** Am I in this negotiation at all? */
  isParty: boolean;
  isEmployer: boolean;
  isWorker: boolean;
  /** Settled offers are read-only, for both sides. */
  isSettled: boolean;
  /** True when this side named the price currently on the table. */
  proposedCurrentPrice: boolean;
  canAccept: boolean;
  canDecline: boolean;
  canCounter: boolean;
  canWithdraw: boolean;
  /** Whose move it is — used for the "waiting on them" line in the UI. */
  waitingOn: 'you' | 'them' | 'nobody';
}

/**
 * Who can do what, given an offer and the person looking at it.
 *
 * These are the same rules the database enforces in `guard_offer_update`. The
 * copy here exists so the UI can grey out a button rather than let someone
 * press it and read a Postgres error. The database is still the authority: if
 * these two ever disagree, the database wins and the user sees a message.
 */
export function offerPermissions(offer: Offer, viewerId: string | null): OfferPermissions {
  const isEmployer = Boolean(viewerId) && offer.employer_id === viewerId;
  const isWorker = Boolean(viewerId) && offer.worker_id === viewerId;
  const isParty = isEmployer || isWorker;
  const isSettled = offer.status === 'accepted' || offer.status === 'declined';

  // `last_actor` is stamped by the database on insert and on every price
  // change, so it is always the person whose number is currently on the table.
  const proposedCurrentPrice = Boolean(viewerId) && offer.last_actor === viewerId;

  const live = isParty && !isSettled;

  return {
    isParty,
    isEmployer,
    isWorker,
    isSettled,
    proposedCurrentPrice,
    // Nobody accepts their own number.
    canAccept: live && !proposedCurrentPrice,
    canDecline: live,
    canCounter: live,
    // An employer can pull an untouched offer back; once it has been countered
    // there is a conversation on the record and it gets declined instead.
    canWithdraw: isEmployer && offer.status === 'pending',
    waitingOn: !isParty || isSettled ? 'nobody' : proposedCurrentPrice ? 'them' : 'you',
  };
}

/** The other person in a negotiation, from one side's point of view. */
export function counterparty(offer: Offer, viewerId: string | null): Profile | null {
  if (viewerId && offer.employer_id === viewerId) return offer.worker;
  return offer.employer;
}

/** How far the price has travelled from the opening bid, as a signed percent. */
export function offerMovement(offer: Offer, openingPrice: number | null): number | null {
  if (!openingPrice || openingPrice <= 0) return null;
  return Math.round(((offer.offered_price - openingPrice) / openingPrice) * 100);
}

/* --------------------------------------------------- the connection rules */

export type ConnectionView =
  | { state: 'none'; connection: null }
  | { state: 'outgoing'; connection: Connection }
  | { state: 'incoming'; connection: Connection }
  | { state: 'connected'; connection: Connection }
  | { state: 'rejected'; connection: Connection }
  | { state: 'blocked'; connection: Connection };

/**
 * Where I stand with one other person, given every connection row I can see.
 *
 * The unique constraint is on the ordered pair, so a row can exist in either
 * direction and both have to be checked.
 */
export function connectionWith(
  connections: Connection[],
  meId: string | null,
  otherId: string,
): ConnectionView {
  if (!meId || meId === otherId) return { state: 'none', connection: null };

  const row = connections.find(
    (c) =>
      (c.requester_id === meId && c.receiver_id === otherId) ||
      (c.requester_id === otherId && c.receiver_id === meId),
  );
  if (!row) return { state: 'none', connection: null };

  if (row.status === 'accepted') return { state: 'connected', connection: row };
  if (row.status === 'blocked') return { state: 'blocked', connection: row };
  if (row.status === 'rejected') return { state: 'rejected', connection: row };
  return row.requester_id === meId
    ? { state: 'outgoing', connection: row }
    : { state: 'incoming', connection: row };
}

/** Everyone I am actually connected to. */
export function acceptedPeers(connections: Connection[], meId: string | null): Profile[] {
  if (!meId) return [];
  return compact(
    connections
      .filter((c) => c.status === 'accepted')
      .map((c) => (c.requester_id === meId ? c.receiver : c.requester)),
  );
}

/** Requests waiting for me to answer. */
export function incomingRequests(connections: Connection[], meId: string | null): Connection[] {
  if (!meId) return [];
  return connections.filter((c) => c.status === 'pending' && c.receiver_id === meId);
}

/** Requests I have sent that nobody has answered yet. */
export function outgoingRequests(connections: Connection[], meId: string | null): Connection[] {
  if (!meId) return [];
  return connections.filter((c) => c.status === 'pending' && c.requester_id === meId);
}

/* ------------------------------------------------------------- earnings */

export interface EarningsBucket {
  key: string;
  label: string;
  total: number;
  count: number;
}

export interface EarningsSummary {
  lifetime: number;
  jobs: number;
  average: number;
  best: number;
  thisMonth: number;
  buckets: EarningsBucket[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Real earnings, derived from accepted offers. Nothing is estimated and
 * nothing is invented: if no offer has been accepted, this is zero, and the
 * screen says so rather than drawing a chart of imaginary money.
 */
export function earningsFor(offers: Offer[], meId: string | null, now: Date, months = 6): EarningsSummary {
  const mine = offers.filter((o) => o.status === 'accepted' && o.worker_id === meId);

  const buckets: EarningsBucket[] = [];
  const index = new Map<string, EarningsBucket>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket: EarningsBucket = { key, label: MONTHS[d.getMonth()], total: 0, count: 0 };
    buckets.push(bucket);
    index.set(key, bucket);
  }

  let lifetime = 0;
  let best = 0;
  let thisMonth = 0;
  const currentKey = `${now.getFullYear()}-${now.getMonth()}`;

  for (const o of mine) {
    const amount = o.offered_price;
    lifetime += amount;
    if (amount > best) best = amount;

    const d = new Date(o.updated_at || o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key === currentKey) thisMonth += amount;
    const bucket = index.get(key);
    if (bucket) {
      bucket.total += amount;
      bucket.count += 1;
    }
  }

  return {
    lifetime,
    jobs: mine.length,
    average: mine.length ? Math.round(lifetime / mine.length) : 0,
    best,
    thisMonth,
    buckets,
  };
}

/* --------------------------------------------------------------- people */

export function displayName(profile: Profile | null | undefined): string {
  if (!profile) return 'Someone';
  return profile.full_name?.trim() || profile.username || 'Someone';
}

export function handleOf(profile: Profile | null | undefined): string {
  return profile?.username ? `@${profile.username}` : '';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A stable colour per person, so avatars are recognisable without a photo. */
export function avatarHue(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}
