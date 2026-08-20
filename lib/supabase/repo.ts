import type { DB, Job, JobStatus, Message, Payment, Review, SosEvent, Verification, Worker, Client } from '../types';
import { supabase } from './client';
import { TABLES } from './types';
import type { BookingRow, JobRow, MessageRow, ResidentRow, ReviewRow, SosRow, WorkerPublicRow } from './types';
import {
  bookingToRow, clientFromRow, clientToRow, jobFromRow, jobToRow,
  messageFromRow, messageToRow, reviewFromRow, reviewToRow,
  sosFromRow, sosToRow, workerFromRow, workerToRow,
} from './mappers';

/* ===========================================================================
   THE REPOSITORY
   ---------------------------------------------------------------------------
   Every Supabase read and write in the app. Two rules hold everywhere:

   1. NOTHING THROWS. Every function returns a result or null. A marketplace
      that white-screens because a query timed out is worse than one showing
      slightly stale data, and this app has already been taken down once by an
      exception nobody could catch.

   2. NOTHING BLOCKS THE UI. Writes are optimistic: the store updates local
      state first and calls these afterwards. The user never waits on a network
      round trip to see their own action — which is the "Send Booking Request
      is slow" complaint, fixed at the level it is caused.
   =========================================================================== */

/** Log once per unique failure, so a broken table does not flood the console. */
const seen = new Set<string>();
function warn(where: string, error: unknown): null {
  const msg = (error as { message?: string })?.message ?? String(error);
  const key = `${where}:${msg}`;
  if (!seen.has(key)) {
    seen.add(key);
    console.warn(`[supabase] ${where} — ${msg}. Falling back to local data.`);
  }
  return null;
}

/* ------------------------------------------------------------------ reads */

/** The whole world, in as few round trips as possible. */
export async function fetchAll(): Promise<Partial<DB> | null> {
  const sb = supabase();
  if (!sb) return null;

  try {
    const [workers, residents, jobs, bookings, messages, reviews, sos] = await Promise.all([
      sb.from(TABLES.workersPublic).select('*').limit(500),
      sb.from(TABLES.residents).select('*').limit(500),
      sb.from(TABLES.jobs).select('*').order('created_at', { ascending: false }).limit(500),
      sb.from(TABLES.bookings).select('*').limit(500),
      sb.from(TABLES.messages).select('*').order('created_at').limit(1000),
      sb.from(TABLES.reviews).select('*').limit(500),
      sb.from(TABLES.sos).select('*').limit(200),
    ]);

    const firstError = [workers, residents, jobs, bookings, messages, reviews, sos]
      .find((r) => r.error)?.error;
    if (firstError) return warn('fetchAll', firstError);

    const byJob = new Map<string, BookingRow>();
    for (const b of (bookings.data ?? []) as BookingRow[]) byJob.set(b.job_id, b);

    return {
      workers: ((workers.data ?? []) as WorkerPublicRow[]).map(workerFromRow),
      clients: ((residents.data ?? []) as ResidentRow[]).map(clientFromRow),
      jobs: ((jobs.data ?? []) as JobRow[]).map((j) => jobFromRow(j, byJob.get(j.id))),
      messages: ((messages.data ?? []) as MessageRow[]).map(messageFromRow),
      reviews: ((reviews.data ?? []) as ReviewRow[]).map(reviewFromRow),
      sos: ((sos.data ?? []) as SosRow[]).map(sosFromRow),
      quotes: [],
    };
  } catch (e) {
    return warn('fetchAll', e);
  }
}

/* ----------------------------------------------------------------- writes */

/** createJob / createBooking — the request, and the assignment if one exists. */
export async function upsertJob(job: Job): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(TABLES.jobs).upsert(jobToRow(job), { onConflict: 'id' });
    if (error) { warn('upsertJob', error); return false; }

    const booking = bookingToRow(job);
    if (booking) {
      const { error: bErr } = await sb.from(TABLES.bookings).upsert(booking, { onConflict: 'job_id' });
      if (bErr) { warn('upsertBooking', bErr); return false; }
    }
    return true;
  } catch (e) { warn('upsertJob', e); return false; }
}

/** updateJobStatus — the status lives on the job, the timestamps on the booking. */
export async function updateJobStatus(job: Job, status: JobStatus): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(TABLES.jobs).update({ status }).eq('id', job.id);
    if (error) { warn('updateJobStatus', error); return false; }
    const booking = bookingToRow({ ...job, status });
    if (booking) await sb.from(TABLES.bookings).upsert(booking, { onConflict: 'job_id' });
    return true;
  } catch (e) { warn('updateJobStatus', e); return false; }
}

export async function updatePayment(job: Job, payment: Payment): Promise<boolean> {
  const sb = supabase();
  if (!sb || !job.assignedWorkerId) return false;
  try {
    const { error } = await sb.from(TABLES.bookings).update({
      payment_method: payment.method ?? null,
      payment_status: payment.status,
      payment_amount: payment.amount ?? null,
      payment_ref: payment.orderRef ?? null,
      payment_protected: payment.protected,
    }).eq('job_id', job.id);
    return error ? Boolean(warn('updatePayment', error)) : true;
  } catch (e) { warn('updatePayment', e); return false; }
}

/** sendMessage. Returns the stored row's id so the optimistic copy can adopt it. */
export async function sendMessage(m: Message): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from(TABLES.messages)
      .insert(messageToRow(m)).select('id').single();
    if (error) return warn('sendMessage', error);
    return (data as { id: string } | null)?.id ?? null;
  } catch (e) { return warn('sendMessage', e); }
}

/** createReview, and the worker's aggregate that a profile shows. */
export async function createReview(r: Review, worker?: Worker): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(TABLES.reviews).insert(reviewToRow(r));
    if (error) { warn('createReview', error); return false; }

    if (worker) {
      const count = worker.reviewCount + 1;
      const rating = Number(((worker.rating * worker.reviewCount + r.stars) / count).toFixed(1));
      await sb.from(TABLES.workers).update({
        rating, review_count: count, jobs_completed: worker.jobsCompleted + 1,
      }).eq('id', worker.id);
    }
    return true;
  } catch (e) { warn('createReview', e); return false; }
}

export async function createSOS(e: SosEvent): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(TABLES.sos).insert(sosToRow(e));
    return error ? Boolean(warn('createSOS', error)) : true;
  } catch (err) { warn('createSOS', err); return false; }
}

/**
 * Verification. Writes ONLY the last four digits — the column is CHECK
 * constrained to exactly four, so a full number is rejected by the database
 * even if a caller tries.
 */
export async function updateVerification(workerId: string, v: Verification): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(TABLES.verification).upsert({
      worker_id: workerId,
      status: v.status,
      id_last4: v.idLast4 ?? null,
      id_name: v.idName ?? null,
      method: v.method,
      checked_at: v.checkedAt ? new Date(v.checkedAt).toISOString() : null,
      failure_reason: v.failureReason ?? null,
    }, { onConflict: 'worker_id' });
    return error ? Boolean(warn('updateVerification', error)) : true;
  } catch (e) { warn('updateVerification', e); return false; }
}

export async function upsertWorker(w: Worker): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from(TABLES.workers).upsert(workerToRow(w), { onConflict: 'id' });
    if (error) { warn('upsertWorker', error); return false; }
    await updateVerification(w.id, w.verification);
    return true;
  } catch (e) { warn('upsertWorker', e); return false; }
}

export async function upsertClient(c: Client): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    /* `role` is deliberately omitted from updates: the database has a trigger
       that rejects a change, and sending it unchanged just invites a 400. */
    const { error } = await sb.from(TABLES.residents).upsert(clientToRow(c), { onConflict: 'id' });
    return error ? Boolean(warn('upsertClient', error)) : true;
  } catch (e) { warn('upsertClient', e); return false; }
}

/* --------------------------------------------------------------- realtime */

export type RealtimeEvent =
  | { kind: 'job'; job: Job }
  | { kind: 'message'; message: Message }
  | { kind: 'sos'; sos: SosEvent };

/**
 * Live updates. Returns an unsubscribe function, always — including when
 * Supabase is not configured, so callers never branch on it.
 *
 * One channel, several tables. A channel per table means several websockets
 * and several reconnect storms when a phone comes off a lift.
 */
export function subscribe(onEvent: (e: RealtimeEvent) => void): () => void {
  const sb = supabase();
  if (!sb) return () => {};

  try {
    const channel = sb.channel('lokasetu-live');

    channel.on('postgres_changes', { event: '*', schema: 'public', table: TABLES.jobs },
      (payload: { new?: unknown }) => {
        const row = payload.new as JobRow | undefined;
        if (row?.id) onEvent({ kind: 'job', job: jobFromRow(row) });
      });

    channel.on('postgres_changes', { event: '*', schema: 'public', table: TABLES.bookings },
      async (payload: { new?: unknown }) => {
        /* A booking change means the job's assignment or payment moved; refetch
           the job so subscribers get one complete object rather than a half. */
        const row = payload.new as BookingRow | undefined;
        if (!row?.job_id) return;
        const { data } = await sb.from(TABLES.jobs).select('*').eq('id', row.job_id).single();
        if (data) onEvent({ kind: 'job', job: jobFromRow(data as JobRow, row) });
      });

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLES.messages },
      (payload: { new?: unknown }) => {
        const row = payload.new as MessageRow | undefined;
        if (row?.id) onEvent({ kind: 'message', message: messageFromRow(row) });
      });

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLES.sos },
      (payload: { new?: unknown }) => {
        const row = payload.new as SosRow | undefined;
        if (row?.id) onEvent({ kind: 'sos', sos: sosFromRow(row) });
      });

    channel.subscribe();
    return () => { try { sb.removeChannel(channel); } catch { /* already gone */ } };
  } catch (e) {
    warn('subscribe', e);
    return () => {};
  }
}
