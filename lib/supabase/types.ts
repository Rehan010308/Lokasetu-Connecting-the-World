import type { Geo, Job, JobStatus, LangCode, PaymentMethod, PaymentStatus, Role, Worker, Client, Message, Review, SosEvent, Verification } from '../types';

/* ===========================================================================
   DATABASE ROW SHAPES
   ---------------------------------------------------------------------------
   These mirror supabase/schema.sql exactly. They are written by hand rather
   than generated so the repository has no dependency on the Supabase CLI, and
   so a column rename shows up as a TypeScript error rather than an undefined
   at runtime.

   Convention: rows are snake_case (Postgres), the domain model is camelCase
   (lib/types.ts). Everything crossing that boundary goes through
   lib/supabase/mappers.ts and nowhere else.
   =========================================================================== */

export interface WorkerRow {
  id: string;
  name: string;
  phone: string;
  lang: string;
  languages: string[];
  category: string;
  services: string[];
  experience_years: number | null;
  raw_speech: string | null;
  bio: string | null;
  lat: number;
  lng: number;
  area_name: string;
  city_id: string | null;
  locality_id: string | null;
  radius_km: number;
  availability: string;
  jobs_completed: number;
  rating: number;
  review_count: number;
  response_mins: number;
  emergency_contact: string | null;
  created_at: string;
}

/** What the public view exposes — note the absence of `phone`. */
export interface WorkerPublicRow extends Omit<WorkerRow, 'phone' | 'emergency_contact' | 'raw_speech'> {
  verification_status: Verification['status'];
  id_last4: string | null;
  checked_at: string | null;
}

export interface ResidentRow {
  id: string;
  role: Role;
  name: string;
  phone: string;
  lang: string;
  lat: number;
  lng: number;
  area_name: string;
  address: string | null;
  city_id: string | null;
  locality_id: string | null;
  org_name: string | null;
  org_type: string | null;
  size: number | null;
  emergency_contact: string | null;
  saved_places: unknown;
  preferred_payment: string | null;
  created_at: string;
}

export interface JobRow {
  id: string;
  client_id: string;
  client_role: Exclude<Role, 'worker'>;
  title: string;
  raw_request: string;
  lang: string;
  category: string;
  service_id: string | null;
  when_text: string | null;
  urgency: string;
  estimated_hours: number;
  time_pref: string | null;
  scheduled_at: string | null;
  duration: string | null;
  photos: unknown;
  lat: number;
  lng: number;
  area_name: string;
  address: string | null;
  city_id: string | null;
  locality_id: string | null;
  price_min: number;
  price_max: number;
  price_basis: string | null;
  status: JobStatus;
  shift: unknown;
  staff_count: number | null;
  requested_worker_ids: string[];
  requested_at: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  job_id: string;
  worker_id: string;
  agreed_amount: number | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_amount: number | null;
  payment_ref: string | null;
  payment_protected: boolean;
  accepted_at: string | null;
  travel_started_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancel_fee: number | null;
  cancel_refunded: boolean | null;
}

export interface MessageRow {
  id: string;
  job_id: string;
  from_role: 'worker' | 'client';
  from_id: string;
  kind: 'text' | 'voice' | 'quick';
  text: string;
  lang: string;
  duration_sec: number | null;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  job_id: string;
  worker_id: string;
  author_name: string;
  stars: number;
  text: string;
  tags: string[];
  created_at: string;
}

export interface SosRow {
  id: string;
  job_id: string;
  raised_by: 'worker' | 'client';
  lat: number | null;
  lng: number | null;
  resolved: boolean;
  created_at: string;
}

export interface VerificationRow {
  worker_id: string;
  status: Verification['status'];
  id_last4: string | null;
  id_name: string | null;
  method: string;
  checked_at: string | null;
  failure_reason: string | null;
}

/** Table names, so a typo in a query is a compile error. */
export const TABLES = {
  workers: 'workers',
  workersPublic: 'workers_public',
  residents: 'residents',
  jobs: 'jobs',
  bookings: 'bookings',
  messages: 'messages',
  reviews: 'reviews',
  sos: 'sos_events',
  verification: 'verification_status',
} as const;

export type { Geo, Job, Worker, Client, Message, Review, SosEvent, Verification, LangCode };
