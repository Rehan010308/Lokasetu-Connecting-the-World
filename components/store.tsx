'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  DB, Job, LangCode, Message, PaymentMethod, Quote, Resident, Review, Worker,
} from '@/lib/types';
import { seedDB } from '@/lib/seed';
import { makeT, type TKey } from '@/lib/i18n';
import { computeTrust } from '@/lib/ai/trust';

const STORAGE_KEY = 'kaamsetu:v1';

/**
 * Phase 1 persistence: the browser.
 * Everything below is deliberately written as if it were an API client, so
 * moving to Postgres/Supabase later means rewriting this one file and nothing
 * else. All reads go through the `db` object; all writes go through `update`.
 */
interface StoreValue {
  db: DB;
  ready: boolean;
  update: (fn: (d: DB) => DB) => void;
  reset: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => seedDB());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DB;
        if (parsed && Array.isArray(parsed.workers)) setDb(parsed);
      }
    } catch {
      /* corrupt storage - fall back to the seed */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* quota - ignore, demo only */
    }
  }, [db, ready]);

  const update = useCallback((fn: (d: DB) => DB) => {
    setDb((prev) => fn({ ...prev }));
  }, []);

  const reset = useCallback(() => {
    const fresh = seedDB();
    setDb(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {}
  }, []);

  const value = useMemo(() => ({ db, ready, update, reset }), [db, ready, update, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

/** Current UI language + a bound translate function. */
export function useT() {
  const { db } = useStore();
  const lang = db.session.lang;
  return useMemo(() => {
    const fn = makeT(lang);
    return { lang, t: (k: TKey) => fn(k) };
  }, [lang]);
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Actions - the "API"
// ---------------------------------------------------------------------------

export function useActions() {
  const { db, update, reset } = useStore();

  return useMemo(() => ({
    reset,

    setLang(lang: LangCode) {
      update((d) => ({ ...d, session: { ...d.session, lang } }));
    },

    logout() {
      update((d) => ({ ...d, session: { role: null, id: null, lang: d.session.lang } }));
    },

    /** Resident sign-in. Creates the account on first login. */
    loginResident(phone: string, lang: LangCode, name?: string): string {
      const existing = db.residents.find((r) => r.phone === phone);
      if (existing) {
        update((d) => ({
          ...d,
          session: { role: 'resident', id: existing.id, lang },
          residents: d.residents.map((r) => (r.id === existing.id ? { ...r, lang } : r)),
        }));
        return existing.id;
      }
      const id = newId('r');
      const resident: Resident = {
        id,
        name: name?.trim() || 'Resident',
        phone,
        lang,
        geo: db.residents[0]?.geo ?? { lat: 12.9352, lng: 77.6245, areaName: 'Koramangala, Bengaluru' },
        createdAt: Date.now(),
      };
      update((d) => ({
        ...d,
        residents: [...d.residents, resident],
        session: { role: 'resident', id, lang },
      }));
      return id;
    },

    setResidentGeo(residentId: string, geo: Resident['geo']) {
      update((d) => ({
        ...d,
        residents: d.residents.map((r) => (r.id === residentId ? { ...r, geo } : r)),
      }));
    },

    /** Worker sign-up at the end of onboarding. */
    registerWorker(w: Omit<Worker, 'id' | 'jobsDone' | 'trust' | 'createdAt'>): string {
      const existing = db.workers.find((x) => x.phone === w.phone);
      const id = existing?.id ?? newId('w');
      const worker: Worker = {
        ...w,
        id,
        jobsDone: existing?.jobsDone ?? 0,
        trust: existing?.trust ?? computeTrust([]),
        createdAt: existing?.createdAt ?? Date.now(),
      };
      update((d) => ({
        ...d,
        workers: existing
          ? d.workers.map((x) => (x.id === id ? worker : x))
          : [...d.workers, worker],
        session: { role: 'worker', id, lang: w.lang },
      }));
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

    updateWorker(id: string, patch: Partial<Worker>) {
      update((d) => ({
        ...d,
        workers: d.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      }));
    },

    postJob(job: Omit<Job, 'id' | 'status' | 'createdAt'>): string {
      const id = newId('j');
      const full: Job = { ...job, id, status: 'open', createdAt: Date.now() };
      update((d) => ({ ...d, jobs: [full, ...d.jobs] }));
      return id;
    },

    addQuote(jobId: string, workerId: string, amount: number, note: string) {
      const q: Quote = { id: newId('q'), jobId, workerId, amount, note, createdAt: Date.now() };
      update((d) => ({
        ...d,
        quotes: [...d.quotes.filter((x) => !(x.jobId === jobId && x.workerId === workerId)), q],
      }));
    },

    hire(jobId: string, workerId: string, amount: number) {
      update((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === jobId
            ? { ...j, status: 'assigned', assignedWorkerId: workerId, agreedAmount: amount, paymentStatus: 'pending' }
            : j
        ),
      }));
    },

    workerMarkDone(jobId: string) {
      update((d) => ({
        ...d,
        jobs: d.jobs.map((j) => (j.id === jobId ? { ...j, status: 'worker_done' } : j)),
      }));
    },

    confirmDone(jobId: string) {
      update((d) => ({
        ...d,
        jobs: d.jobs.map((j) => (j.id === jobId ? { ...j, status: 'completed' } : j)),
      }));
    },

    setPayment(jobId: string, method: PaymentMethod, paid: boolean) {
      update((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === jobId ? { ...j, paymentMethod: method, paymentStatus: paid ? 'paid' : 'pending' } : j
        ),
      }));
    },

    submitReview(jobId: string, workerId: string, r: Omit<Review, 'id' | 'jobId' | 'workerId' | 'createdAt'>) {
      const review: Review = { id: newId('rev'), jobId, workerId, createdAt: Date.now(), ...r };
      update((d) => {
        const reviews = [...d.reviews.filter((x) => x.jobId !== jobId), review];
        const forWorker = reviews.filter((x) => x.workerId === workerId);
        return {
          ...d,
          reviews,
          workers: d.workers.map((w) =>
            w.id === workerId
              ? {
                  ...w,
                  // seeded workers already carry historical ratings; blend the
                  // new review in rather than wiping their history
                  trust: blendTrust(w, forWorker.length, computeTrust(forWorker)),
                  jobsDone: w.jobsDone + 1,
                }
              : w
          ),
        };
      });
    },

    sendMessage(jobId: string, fromRole: 'worker' | 'resident', fromId: string, text: string, lang: LangCode) {
      const m: Message = { id: newId('m'), jobId, fromRole, fromId, text, lang, createdAt: Date.now() };
      update((d) => ({ ...d, messages: [...d.messages, m] }));
    },
  }), [db, update, reset]);
}

function blendTrust(w: Worker, newCount: number, fresh: ReturnType<typeof computeTrust>) {
  const oldCount = w.trust.reviewCount;
  if (oldCount === 0) return fresh;
  const total = oldCount + 1;
  const mix = (a: number, b: number) => Math.round(((a * oldCount + b) / total) * 10) / 10;
  return {
    reliability: mix(w.trust.reliability, fresh.reliability),
    skillQuality: mix(w.trust.skillQuality, fresh.skillQuality),
    professionalism: mix(w.trust.professionalism, fresh.professionalism),
    overall: mix(w.trust.overall, fresh.overall),
    reviewCount: total,
  };
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useCurrentWorker(): Worker | null {
  const { db } = useStore();
  if (db.session.role !== 'worker' || !db.session.id) return null;
  return db.workers.find((w) => w.id === db.session.id) ?? null;
}

export function useCurrentResident(): Resident | null {
  const { db } = useStore();
  if (db.session.role !== 'resident' || !db.session.id) return null;
  return db.residents.find((r) => r.id === db.session.id) ?? null;
}
