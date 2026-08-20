'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Cancellation, Client, DB, Job, JobStatus, LangCode, Message, MessageKind,
  Geo, Payment, PaymentMethod, Review, Role, SosEvent, Verification, Worker,
} from '@/lib/types';
import { EMPTY_PAYMENT, amountFor } from '@/lib/payments';
import { cancelTerms, type CancelActor } from '@/lib/cancellation';
import { seedDB, DEMO_ACCOUNTS } from '@/lib/seed';
import { geoOf } from '@/lib/cities';
import { VERSION } from '@/lib/version';
import { makeT, type TKey } from '@/lib/i18n';

const STORAGE_KEY = 'lokasetu:v2';

/**
 * What is on disk, plus the build that put it there.
 *
 * Storage outlives deployments. A browser that used an older version keeps its
 * data, and the next version reads that older shape as if it wrote it — which
 * fails somewhere far from the cause, usually as a blank screen. Stamping the
 * version means a mismatch is detected on read and thrown away, and the demo
 * simply reseeds. Cheap, and it removes an entire category of "works for me".
 */
interface Stored {
  version: string;
  db: DB;
}

/**
 * Phase 1 persistence: the browser.
 * Written as an API client so moving to Postgres means rewriting this one
 * file. Every read goes through `db`; every write goes through `update`.
 */
interface StoreValue {
  db: DB;
  ready: boolean;
  update: (fn: (d: DB) => DB) => void;
  reset: () => void;
  /** Re-read from storage. What pull-to-refresh actually does. */
  refresh: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

/**
 * An empty database, used for exactly one render: the server's.
 *
 * WHY THIS EXISTS. The provider used to seed inside the useState initialiser —
 * `useState(() => seedDB())` — which meant Next.js built the entire demo
 * database (113 workers, 400+ jobs) during PRERENDER, on the server, for every
 * static route including /_not-found. Anything that throws inside seedDB then
 * fails the production build rather than one screen at runtime, which is how a
 * data-layer slip turns into "Export encountered an error on /_not-found".
 *
 * Seeding is browser work: it reads localStorage and stamps timestamps against
 * the visitor's clock. So the server renders an empty store and every screen
 * shows its loading state, and the real data arrives in the mount effect. The
 * server now does no work that can fail.
 */
const EMPTY_DB: DB = {
  workers: [], clients: [], jobs: [], quotes: [], messages: [], reviews: [], sos: [],
  session: { role: null, id: null, lang: 'en' },
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(EMPTY_DB);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as Stored) : null;
      const usable =
        stored?.version === VERSION &&
        stored.db &&
        Array.isArray(stored.db.workers) && stored.db.workers.length > 0 &&
        Array.isArray(stored.db.clients) &&
        Array.isArray(stored.db.jobs);

      setDb(usable ? stored!.db : seedDB());
    } catch {
      /* corrupt or foreign storage — a fresh seed always beats a broken app */
      setDb(seedDB());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      const payload: Stored = { version: VERSION, db };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch { /* quota or private mode — the app works, it just will not persist */ }
  }, [db, ready]);

  const update = useCallback((fn: (d: DB) => DB) => setDb((prev) => fn({ ...prev })), []);

  /**
   * Pull-to-refresh means "show me what is actually stored right now".
   * With localStorage that is a genuine re-read, not theatre: another tab —
   * the worker's window during a two-window demo — writes to the same key,
   * and this is how that lands here. When this file becomes an API client,
   * the body becomes a GET and nothing above it changes.
   */
  const refresh = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Stored;
      if (stored?.version === VERSION && stored.db && Array.isArray(stored.db.workers)) setDb(stored.db);
    } catch { /* leave the in-memory copy alone */ }
  }, []);
  const reset = useCallback(() => {
    const fresh = seedDB();
    setDb(fresh);
    try {
      const payload: Stored = { version: VERSION, db: fresh };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, []);

  const value = useMemo(() => ({ db, ready, update, reset, refresh }), [db, ready, update, reset, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

/** Current language plus a bound translate function. */
export function useT() {
  const { db } = useStore();
  const lang = db.session.lang;
  return useMemo(() => ({ lang, t: makeT(lang) as (k: TKey) => string }), [lang]);
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

/* ------------------------------------------------------------------ actions */

export function useActions() {
  const { db, update, reset } = useStore();

  return useMemo(() => ({
    reset,

    setLang(lang: LangCode) {
      update((d) => {
        const next = { ...d, session: { ...d.session, lang } };
        // keep the signed-in person's stored language in step with the UI
        if (d.session.role === 'worker' && d.session.id) {
          next.workers = d.workers.map((w) => (w.id === d.session.id ? { ...w, lang } : w));
        } else if (d.session.id) {
          next.clients = d.clients.map((c) => (c.id === d.session.id ? { ...c, lang } : c));
        }
        return next;
      });
    },

    logout() {
      update((d) => ({ ...d, session: { role: null, id: null, lang: d.session.lang } }));
    },

    /** One-tap sign-in for judges and evaluators. */
    loginDemo(role: Role): string | null {
      const acc = DEMO_ACCOUNTS.find((a) => a.role === role);
      if (!acc) return null;
      const lang = role === 'worker'
        ? db.workers.find((w) => w.id === acc.id)?.lang ?? 'en'
        : db.clients.find((c) => c.id === acc.id)?.lang ?? 'en';
      update((d) => ({ ...d, session: { role, id: acc.id, lang, demo: true } }));
      return acc.id;
    },

    loginClient(role: Exclude<Role, 'worker'>, phone: string, lang: LangCode, name: string, orgName?: string, geo?: Geo): string {
      const existing = db.clients.find((c) => c.phone === phone);
      if (existing) {
        update((d) => ({
          ...d,
          clients: d.clients.map((c) => (c.id === existing.id ? { ...c, lang, ...(geo ? { geo } : {}) } : c)),
          session: { role: existing.role, id: existing.id, lang },
        }));
        return existing.id;
      }
      const id = newId(role[0]);
      const client: Client = {
        id, role, name: name.trim() || 'User', phone, lang,
        orgName: orgName?.trim() || undefined,
        /* Where they said they are. Falling back to a hardcoded Koramangala
           put every new customer in Bengaluru — including the ones in Mumbai. */
        geo: geo ?? db.clients[0]?.geo ?? geoOf('blr_koramangala')!,
        createdAt: Date.now(),
      };
      update((d) => ({ ...d, clients: [...d.clients, client], session: { role, id, lang } }));
      return id;
    },

    loginWorker(phone: string, lang: LangCode): string | null {
      const existing = db.workers.find((x) => x.phone === phone);
      if (!existing) return null;
      update((d) => ({
        ...d,
        workers: d.workers.map((x) => (x.id === existing.id ? { ...x, lang } : x)),
        session: { role: 'worker', id: existing.id, lang },
      }));
      return existing.id;
    },

    registerWorker(w: Omit<Worker, 'id' | 'jobsCompleted' | 'rating' | 'reviewCount' | 'responseMins' | 'createdAt'>): string {
      const existing = db.workers.find((x) => x.phone === w.phone);
      const id = existing?.id ?? newId('w');
      const worker: Worker = {
        ...w, id,
        jobsCompleted: existing?.jobsCompleted ?? 0,
        rating: existing?.rating ?? 0,
        reviewCount: existing?.reviewCount ?? 0,
        responseMins: existing?.responseMins ?? 15,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      update((d) => ({
        ...d,
        workers: existing ? d.workers.map((x) => (x.id === id ? worker : x)) : [...d.workers, worker],
        session: { role: 'worker', id, lang: w.lang },
      }));
      return id;
    },

    updateWorker(id: string, patch: Partial<Worker>) {
      update((d) => ({ ...d, workers: d.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
    },

    setVerification(workerId: string, verification: Verification) {
      update((d) => ({ ...d, workers: d.workers.map((w) => (w.id === workerId ? { ...w, verification } : w)) }));
    },

    updateClient(id: string, patch: Partial<Client>) {
      update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    },

    /**
     * A customer REQUESTS a booking. It is not assigned to anyone yet — the
     * request goes to every suitable worker and they choose to accept.
     */
    requestBooking(job: Omit<Job, 'id' | 'createdAt' | 'status' | 'payment'>, workerIds: string[]): string {
      const id = newId('bk');
      const now = Date.now();
      update((d) => ({
        ...d,
        jobs: [{
          ...job, id,
          status: 'requested' as JobStatus,
          requestedWorkerIds: workerIds,
          requestedAt: now,
          payment: { ...EMPTY_PAYMENT },
          createdAt: now,
        }, ...d.jobs],
      }));
      return id;
    },

    updateJob(id: string, patch: Partial<Job>) {
      update((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }));
    },

    /** A worker accepts a request. This is the only way a job gets assigned. */
    acceptBooking(jobId: string, workerId: string, amount: number) {
      update((d) => ({
        ...d,
        jobs: d.jobs.map((j) => (j.id === jobId
          ? {
              ...j,
              status: 'accepted' as JobStatus,
              assignedWorkerId: workerId,
              agreedAmount: amount,
              acceptedAt: Date.now(),
            }
          : j)),
      }));
    },

    /**
     * Cancel, applying the published policy. The same cancelTerms() the UI
     * displays is the one used here, so what the customer was shown is exactly
     * what they are charged.
     */
    cancelBooking(jobId: string, by: CancelActor, reason?: string) {
      update((d) => ({
        ...d,
        jobs: d.jobs.map((j) => {
          if (j.id !== jobId) return j;
          const terms = cancelTerms(j, by);
          const cancellation: Cancellation = {
            by, at: Date.now(), reason, fee: terms.fee,
            refunded: j.payment.status === 'held' || j.payment.status === 'authorized',
          };
          return {
            ...j,
            status: (by === 'client' ? 'cancelled_by_client' : 'cancelled_by_worker') as JobStatus,
            cancellation,
            payment: cancellation.refunded
              ? { ...j.payment, status: 'refunded' as const, amount: Math.max(0, (j.payment.amount ?? 0) - terms.fee), protected: false }
              : j.payment,
          };
        }),
      }));
    },

    /** Advance the job, stamping the timestamp the cancellation policy needs. */
    setStatus(jobId: string, status: JobStatus) {
      const stamp: Partial<Job> =
        status === 'on_the_way' ? { travelStartedAt: Date.now() }
        : status === 'working'  ? { startedAt: Date.now() }
        : status === 'completed'? { completedAt: Date.now() }
        : {};
      update((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === jobId ? { ...j, status, ...stamp } : j)) }));
    },

    setPayment(jobId: string, payment: Payment) {
      update((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === jobId ? { ...j, payment } : j)) }));
    },

    /**
     * kind 'quick' stores an i18n KEY rather than text, so the person reading
     * it sees it in their own language with no translation step at all.
     */
    sendMessage(jobId: string, fromRole: 'worker' | 'client', fromId: string, kind: MessageKind, text: string, lang: LangCode, durationSec?: number) {
      const m: Message = { id: newId('m'), jobId, fromRole, fromId, kind, text, lang, durationSec, createdAt: Date.now() };
      update((d) => ({ ...d, messages: [...d.messages, m] }));
    },

    addReview(jobId: string, workerId: string, authorName: string, stars: number, text: string, tags: string[]) {
      const review: Review = { id: newId('rv'), jobId, workerId, authorName, stars, text, tags, createdAt: Date.now() };
      update((d) => {
        const all = [...d.reviews.filter((r) => r.jobId !== jobId), review];
        const mine = all.filter((r) => r.workerId === workerId);
        const avg = mine.reduce((s, r) => s + r.stars, 0) / mine.length;
        return {
          ...d,
          reviews: all,
          workers: d.workers.map((w) => (w.id === workerId
            ? { ...w, rating: Math.round(avg * 10) / 10, reviewCount: mine.length, jobsCompleted: w.jobsCompleted + 1 }
            : w)),
        };
      });
    },

    raiseSos(jobId: string, by: 'worker' | 'client', lat?: number, lng?: number): SosEvent {
      const ev: SosEvent = { id: newId('sos'), jobId, at: Date.now(), by, lat, lng, resolved: false };
      update((d) => ({ ...d, sos: [...d.sos, ev] }));
      return ev;
    },
  }), [db, update, reset]);
}

/* ---------------------------------------------------------------- selectors */

export function useCurrentWorker(): Worker | null {
  const { db } = useStore();
  if (db.session.role !== 'worker' || !db.session.id) return null;
  return db.workers.find((w) => w.id === db.session.id) ?? null;
}

export function useCurrentClient(): Client | null {
  const { db } = useStore();
  const { role, id } = db.session;
  if (!id || role === 'worker' || !role) return null;
  return db.clients.find((c) => c.id === id) ?? null;
}

/** Whoever is signed in, plus their location — used by every screen. */
export function useMe() {
  const { db } = useStore();
  const worker = useCurrentWorker();
  const client = useCurrentClient();
  /* `db.workers[0].geo` threw a TypeError the moment the database was empty —
     which it now is on the server, and also is for a corrupt-storage recovery.
     Every link in this chain is optional, and the last resort is a real place
     rather than a crash. */
  const geo: Geo =
    worker?.geo ?? client?.geo ?? db.clients[0]?.geo ?? db.workers[0]?.geo ?? geoOf('blr_koramangala')!;
  return {
    role: db.session.role,
    id: db.session.id,
    demo: !!db.session.demo,
    worker, client, geo,
    name: worker?.name ?? client?.name ?? '',
    phone: worker?.phone ?? client?.phone ?? '',
  };
}
