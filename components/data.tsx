'use client';

/**
 * Data hooks.
 *
 * Each one owns a fetch, a loading flag, an error string and a realtime
 * subscription, so a screen is a layout plus one hook rather than a layout plus
 * a pile of effects. When Postgres changes, the hook refetches; there is no
 * cache to invalidate and nothing to keep in sync by hand.
 *
 * The filter object is turned into a string key before it reaches the effect's
 * dependency array. Passing the object directly is the classic way to get an
 * infinite refetch loop, because a new object literal is a new identity on
 * every render.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listConnections,
  listMyOffers,
  listOffersForPost,
  listPosts,
  listProfiles,
  subscribe,
  type PostFilter,
  type ProfileFilter,
} from '@/lib/queries';
import type { Connection, Offer, Post, Profile } from '@/lib/model';
import { offerPermissions } from '@/lib/model';
import { useAuth } from './providers';

interface Feed<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Run an async load, keep it cancel-safe, and expose a manual reload. */
function useLoader<T>(
  load: () => Promise<{ data: T; error: string | null }>,
  empty: T,
  deps: unknown[],
  enabled = true,
): Feed<T> {
  const [data, setData] = useState<T>(empty);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setData(empty);
      return;
    }
    let current = true;
    setLoading(true);
    load().then((result) => {
      if (!current || !alive.current) return;
      setData(result.data);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}

/* --------------------------------------------------------------- posts */

export function usePosts(filter: PostFilter = {}, enabled = true): Feed<Post[]> {
  const key = JSON.stringify(filter);
  const feed = useLoader<Post[]>(() => listPosts(JSON.parse(key)), [], [key], enabled);

  useEffect(() => subscribe(['posts'], feed.reload), [feed.reload]);

  return feed;
}

/* -------------------------------------------------------------- people */

export function usePeople(filter: ProfileFilter = {}, enabled = true): Feed<Profile[]> {
  const key = JSON.stringify(filter);
  const feed = useLoader<Profile[]>(() => listProfiles(JSON.parse(key)), [], [key], enabled);

  useEffect(() => subscribe(['profiles'], feed.reload), [feed.reload]);

  return feed;
}

/* --------------------------------------------------------- connections */

export function useConnections(): Feed<Connection[]> {
  const { userId } = useAuth();
  const feed = useLoader<Connection[]>(
    () => listConnections(userId as string),
    [],
    [userId],
    Boolean(userId),
  );

  useEffect(() => subscribe(['connections'], feed.reload), [feed.reload]);

  return feed;
}

/* -------------------------------------------------------------- offers */

export function useOffers(): Feed<Offer[]> {
  const { userId } = useAuth();
  const feed = useLoader<Offer[]>(() => listMyOffers(userId as string), [], [userId], Boolean(userId));

  useEffect(() => subscribe(['offers'], feed.reload), [feed.reload]);

  return feed;
}

export function usePostOffers(postId: number | null): Feed<Offer[]> {
  const feed = useLoader<Offer[]>(
    () => listOffersForPost(postId as number),
    [],
    [postId],
    postId !== null,
  );

  useEffect(() => subscribe(['offers'], feed.reload), [feed.reload]);

  return feed;
}

/**
 * How many negotiations are waiting on this person. Drives the badge on the
 * Offers tab, which is the only reason anyone opens the app twice a day.
 */
export function usePendingCount(): number {
  const { userId, status } = useAuth();
  const { data } = useOffers();

  return useMemo(() => {
    if (status !== 'signedIn') return 0;
    return data.filter((offer) => offerPermissions(offer, userId).waitingOn === 'you').length;
  }, [data, userId, status]);
}
