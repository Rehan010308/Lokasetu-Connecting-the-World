import type { Client, Geo, Job, Message, Review, SosEvent, Worker } from '../types';
import type {
  BookingRow, JobRow, MessageRow, ResidentRow, ReviewRow, SosRow, WorkerPublicRow, WorkerRow,
} from './types';

/* ===========================================================================
   ROW  <->  DOMAIN
   ---------------------------------------------------------------------------
   The single boundary between Postgres shapes and the app's model. Every
   translation lives here so there is one place to look when a field goes
   missing, and one place to change when a column is renamed.

   Every mapper is defensive about nulls. A row from a database written by an
   older version of the app, or by hand in the SQL editor, must produce a valid
   domain object or the UI crashes on data nobody controls.
   =========================================================================== */

const ms = (iso: string | null | undefined): number | undefined =>
  iso ? new Date(iso).getTime() : undefined;

const iso = (n: number | null | undefined): string | null =>
  typeof n === 'number' && isFinite(n) ? new Date(n).toISOString() : null;

function geoFrom(r: { lat: number; lng: number; area_name: string; address?: string | null; city_id?: string | null; locality_id?: string | null }): Geo {
  return {
    lat: Number(r.lat) || 0,
    lng: Number(r.lng) || 0,
    areaName: r.area_name ?? '',
    ...(r.address ? { address: r.address } : {}),
    ...(r.city_id ? { cityId: r.city_id } : {}),
    ...(r.locality_id ? { localityId: r.locality_id } : {}),
  };
}

/* ---------------------------------------------------------------- workers */

export function workerFromRow(r: WorkerPublicRow | WorkerRow): Worker {
  const pub = r as WorkerPublicRow;
  return {
    id: r.id,
    name: r.name,
    /* The public view has no phone. Contact goes through the job, and an empty
       string here is correct rather than a leak with a fallback. */
    phone: (r as WorkerRow).phone ?? '',
    lang: (r.lang as Worker['lang']) ?? 'en',
    languages: (r.languages as Worker['languages']) ?? [],
    category: r.category as Worker['category'],
    services: r.services ?? [],
    experienceYears: r.experience_years,
    rawSpeech: (r as WorkerRow).raw_speech ?? '',
    bio: r.bio ?? '',
    geo: geoFrom(r),
    radiusKm: r.radius_km ?? 5,
    availability: (r.availability as Worker['availability']) ?? 'anytime',
    jobsCompleted: r.jobs_completed ?? 0,
    rating: Number(r.rating) || 0,
    reviewCount: r.review_count ?? 0,
    responseMins: r.response_mins ?? 15,
    verification: {
      status: pub.verification_status ?? 'unverified',
      idLast4: pub.id_last4 ?? undefined,
      method: 'simulated',
      checkedAt: ms(pub.checked_at),
    },
    emergencyContact: (r as WorkerRow).emergency_contact ?? undefined,
    createdAt: ms(r.created_at) ?? Date.now(),
  };
}

export function workerToRow(w: Worker): Omit<WorkerRow, 'created_at'> & { created_at?: string } {
  return {
    id: w.id, name: w.name, phone: w.phone, lang: w.lang,
    languages: w.languages, category: w.category, services: w.services,
    experience_years: w.experienceYears,
    raw_speech: w.rawSpeech, bio: w.bio,
    lat: w.geo.lat, lng: w.geo.lng, area_name: w.geo.areaName,
    city_id: w.geo.cityId ?? null, locality_id: w.geo.localityId ?? null,
    radius_km: w.radiusKm, availability: w.availability,
    jobs_completed: w.jobsCompleted, rating: w.rating,
    review_count: w.reviewCount, response_mins: w.responseMins,
    emergency_contact: w.emergencyContact ?? null,
    created_at: iso(w.createdAt) ?? undefined,
  };
}

/* -------------------------------------------------------------- residents */

export function clientFromRow(r: ResidentRow): Client {
  return {
    id: r.id,
    role: r.role as Client['role'],
    name: r.name,
    phone: r.phone ?? '',
    lang: (r.lang as Client['lang']) ?? 'en',
    geo: geoFrom(r),
    orgName: r.org_name ?? undefined,
    orgType: r.org_type ?? undefined,
    size: r.size ?? undefined,
    emergencyContact: r.emergency_contact ?? undefined,
    savedPlaces: Array.isArray(r.saved_places) ? (r.saved_places as Client['savedPlaces']) : [],
    preferredPayment: (r.preferred_payment as Client['preferredPayment']) ?? undefined,
    createdAt: ms(r.created_at) ?? Date.now(),
  };
}

export function clientToRow(c: Client): Omit<ResidentRow, 'created_at'> & { created_at?: string } {
  return {
    id: c.id, role: c.role, name: c.name, phone: c.phone, lang: c.lang,
    lat: c.geo.lat, lng: c.geo.lng, area_name: c.geo.areaName,
    address: c.geo.address ?? null,
    city_id: c.geo.cityId ?? null, locality_id: c.geo.localityId ?? null,
    org_name: c.orgName ?? null, org_type: c.orgType ?? null, size: c.size ?? null,
    emergency_contact: c.emergencyContact ?? null,
    saved_places: c.savedPlaces ?? [],
    preferred_payment: c.preferredPayment ?? null,
    created_at: iso(c.createdAt) ?? undefined,
  };
}

/* ------------------------------------------------------------------- jobs */

/**
 * A domain Job is a jobs row PLUS its bookings row, because the app treats the
 * request and the assignment as one object while the database keeps them
 * apart. `booking` is optional: a job nobody has accepted yet has none.
 */
export function jobFromRow(j: JobRow, b?: BookingRow | null): Job {
  return {
    id: j.id,
    clientId: j.client_id,
    clientRole: j.client_role,
    title: j.title,
    rawRequest: j.raw_request ?? '',
    lang: (j.lang as Job['lang']) ?? 'en',
    category: j.category as Job['category'],
    serviceId: j.service_id ?? undefined,
    whenText: j.when_text ?? undefined,
    photos: Array.isArray(j.photos) ? (j.photos as string[]) : [],
    timePref: (j.time_pref as Job['timePref']) ?? undefined,
    scheduledAt: ms(j.scheduled_at),
    duration: (j.duration as Job['duration']) ?? undefined,
    requestedWorkerIds: j.requested_worker_ids ?? [],
    shift: (j.shift as Job['shift']) ?? undefined,
    staffCount: j.staff_count ?? undefined,
    urgency: (j.urgency as Job['urgency']) ?? 'flexible',
    estimatedHours: Number(j.estimated_hours) || 1,
    geo: geoFrom(j),
    priceMin: j.price_min ?? 0,
    priceMax: j.price_max ?? 0,
    priceBasis: j.price_basis ?? '',
    status: j.status,
    requestedAt: ms(j.requested_at),
    createdAt: ms(j.created_at) ?? Date.now(),

    assignedWorkerId: b?.worker_id ?? undefined,
    agreedAmount: b?.agreed_amount ?? undefined,
    acceptedAt: ms(b?.accepted_at),
    travelStartedAt: ms(b?.travel_started_at),
    startedAt: ms(b?.started_at),
    completedAt: ms(b?.completed_at),
    payment: {
      method: b?.payment_method ?? undefined,
      status: b?.payment_status ?? 'unpaid',
      amount: b?.payment_amount ?? undefined,
      orderRef: b?.payment_ref ?? undefined,
      protected: b?.payment_protected ?? false,
    },
    cancellation: b?.cancelled_at
      ? {
          by: (b.cancelled_by as 'client' | 'worker') ?? 'client',
          at: ms(b.cancelled_at)!,
          reason: b.cancel_reason ?? undefined,
          fee: b.cancel_fee ?? 0,
          refunded: Boolean(b.cancel_refunded),
        }
      : undefined,
  };
}

export function jobToRow(j: Job): Omit<JobRow, 'created_at'> & { created_at?: string } {
  return {
    id: j.id, client_id: j.clientId, client_role: j.clientRole,
    title: j.title, raw_request: j.rawRequest, lang: j.lang,
    category: j.category, service_id: j.serviceId ?? null,
    when_text: j.whenText ?? null, urgency: j.urgency,
    estimated_hours: j.estimatedHours,
    time_pref: j.timePref ?? null,
    scheduled_at: iso(j.scheduledAt),
    duration: j.duration ?? null,
    photos: j.photos ?? [],
    lat: j.geo.lat, lng: j.geo.lng, area_name: j.geo.areaName,
    address: j.geo.address ?? null,
    city_id: j.geo.cityId ?? null, locality_id: j.geo.localityId ?? null,
    price_min: j.priceMin, price_max: j.priceMax, price_basis: j.priceBasis,
    status: j.status,
    shift: j.shift ?? null,
    staff_count: j.staffCount ?? null,
    requested_worker_ids: j.requestedWorkerIds ?? [],
    requested_at: iso(j.requestedAt),
    created_at: iso(j.createdAt) ?? undefined,
  };
}

/** The assignment half of a Job, for writing to `bookings`. */
export function bookingToRow(j: Job): Omit<BookingRow, 'id'> | null {
  if (!j.assignedWorkerId) return null;
  return {
    job_id: j.id,
    worker_id: j.assignedWorkerId,
    agreed_amount: j.agreedAmount ?? null,
    payment_method: j.payment.method ?? null,
    payment_status: j.payment.status,
    payment_amount: j.payment.amount ?? null,
    payment_ref: j.payment.orderRef ?? null,
    payment_protected: j.payment.protected,
    accepted_at: iso(j.acceptedAt),
    travel_started_at: iso(j.travelStartedAt),
    started_at: iso(j.startedAt),
    completed_at: iso(j.completedAt),
    cancelled_by: j.cancellation?.by ?? null,
    cancelled_at: iso(j.cancellation?.at),
    cancel_reason: j.cancellation?.reason ?? null,
    cancel_fee: j.cancellation?.fee ?? 0,
    cancel_refunded: j.cancellation?.refunded ?? false,
  };
}

/* ------------------------------------------------- messages, reviews, sos */

export const messageFromRow = (r: MessageRow): Message => ({
  id: r.id, jobId: r.job_id, fromRole: r.from_role, fromId: r.from_id,
  kind: r.kind, text: r.text ?? '', lang: (r.lang as Message['lang']) ?? 'en',
  durationSec: r.duration_sec ?? undefined,
  createdAt: ms(r.created_at) ?? Date.now(),
});

export const messageToRow = (m: Message) => ({
  job_id: m.jobId, from_role: m.fromRole, from_id: m.fromId,
  kind: m.kind, text: m.text, lang: m.lang,
  duration_sec: m.durationSec ?? null,
});

export const reviewFromRow = (r: ReviewRow): Review => ({
  id: r.id, jobId: r.job_id, workerId: r.worker_id,
  authorName: r.author_name, stars: r.stars, text: r.text ?? '',
  tags: r.tags ?? [], createdAt: ms(r.created_at) ?? Date.now(),
});

export const reviewToRow = (r: Review) => ({
  job_id: r.jobId, worker_id: r.workerId, author_name: r.authorName,
  stars: r.stars, text: r.text, tags: r.tags,
});

export const sosFromRow = (r: SosRow): SosEvent => ({
  id: r.id, jobId: r.job_id, by: r.raised_by,
  at: ms(r.created_at) ?? Date.now(),
  lat: r.lat ?? undefined, lng: r.lng ?? undefined,
  resolved: r.resolved,
});

export const sosToRow = (e: SosEvent) => ({
  job_id: e.jobId, raised_by: e.by,
  lat: e.lat ?? null, lng: e.lng ?? null, resolved: e.resolved,
});
