/* ===========================================================================
   LokaSetu V2 domain model.
   These interfaces are the database schema. When you move off localStorage,
   each one becomes a table with the same columns.
   =========================================================================== */

import type { CategoryId } from './catalog';
import type { ShiftPattern } from './shifts';
export type { CategoryId } from './catalog';
export type { ShiftPattern } from './shifts';

export type LangCode =
  | 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa';

/** Who is using the app. Each role has its own onboarding and dashboard. */
export type Role = 'worker' | 'customer' | 'society' | 'business';

export type Availability = 'today' | 'weekdays' | 'anytime';
export type Urgency = 'emergency' | 'today' | 'this_week' | 'flexible';

/**
 * The booking lifecycle.
 * A customer REQUESTS a booking; a worker ACCEPTS it. Nobody is "hired" by a
 * button press before the worker knows the scope, the time and the address.
 */
export type JobStatus =
  | 'draft'         // being composed in the booking flow
  | 'requested'     // sent to suitable workers, awaiting acceptance
  | 'accepted'      // a worker took it — confirmation page is live
  | 'on_the_way'    // worker travelling; tracking and SOS matter from here
  | 'working'       // worker on site
  | 'worker_done'   // worker says finished, awaiting customer confirmation
  | 'completed'
  | 'cancelled_by_client'
  | 'cancelled_by_worker'
  | 'expired';      // nobody accepted in time

/** When the customer wants the worker. */
export type TimePreference = 'asap' | 'today' | 'tomorrow' | 'scheduled';

/** What the AI estimates the job will take. Shown before anyone commits. */
export type DurationEstimate = 'min30' | 'hr1' | 'hr2' | 'halfday' | 'fullday';

export type PaymentMethod =
  | 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'card_debit' | 'card_credit' | 'cash';

/**
 * Payment states mirror a real gateway, so swapping the stub for Razorpay is a
 * change of implementation, not of model.
 *   unpaid      nothing collected yet
 *   authorized  customer approved; money reserved, not moved
 *   held        collected and held by the platform until the job is confirmed
 *   released    paid out to the worker
 *   refunded    returned to the customer
 */
export type PaymentStatus = 'unpaid' | 'authorized' | 'held' | 'released' | 'refunded';

export interface Payment {
  method?: PaymentMethod;
  status: PaymentStatus;
  /** rupees, not paise, at the UI boundary */
  amount?: number;
  /** gateway order id — Razorpay style */
  orderRef?: string;
  /** true while the platform holds the money on the customer's behalf */
  protected: boolean;
  updatedAt?: number;
}

export interface Cancellation {
  by: 'client' | 'worker';
  at: number;
  reason?: string;
  /** rupees actually charged; 0 when the cancellation was free */
  fee: number;
  refunded: boolean;
}

/* --------------------------------------------------------------- identity */

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed';

/**
 * IMPORTANT — we never store an Aadhaar number.
 * Only the last four digits are kept, purely so a worker can recognise which
 * ID they used. Full numbers are sent to the KYC provider and discarded.
 * See lib/verify.ts for the single swap point to a real provider.
 */
export interface Verification {
  status: VerificationStatus;
  /** last 4 digits only, e.g. "4821" */
  idLast4?: string;
  /** name exactly as returned by the ID provider */
  idName?: string;
  method: 'simulated' | 'digilocker' | 'offline_ekyc';
  checkedAt?: number;
  failureReason?: string;
}

/* ----------------------------------------------------------------- people */

export interface Worker {
  id: string;
  name: string;
  phone: string;
  /** language they chose for the interface */
  lang: LangCode;
  /** every language they can actually converse in — shown on the profile */
  languages: LangCode[];

  category: CategoryId;
  /** service ids from lib/catalog — this is what search filters on */
  services: string[];
  /** null = the worker never told us. Never render a guess in its place. */
  experienceYears: number | null;

  /** verbatim transcript, kept in the script they spoke */
  rawSpeech: string;
  /** AI-written profile bio */
  bio: string;

  geo: Geo;
  radiusKm: number;
  availability: Availability;

  jobsCompleted: number;
  /** plain 1–5 average, rendered as stars. No composite score, no points. */
  rating: number;
  reviewCount: number;
  /** median minutes to first reply — a fact, not a score */
  responseMins: number;

  verification: Verification;
  emergencyContact?: string;
  createdAt: number;
}

/** Customers, societies and businesses share one shape; role decides the UI. */
export interface Client {
  id: string;
  role: Exclude<Role, 'worker'>;
  name: string;
  phone: string;
  lang: LangCode;
  geo: Geo;
  /** society or business name */
  orgName?: string;
  /** e.g. "Apartment complex", "Grocery shop" */
  orgType?: string;
  /** flats in the society, or staff in the business */
  size?: number;
  emergencyContact?: string;
  /** home, office, mother's place — the addresses they book to repeatedly */
  savedPlaces?: SavedPlace[];
  /** what they usually pay with; only ever a method id, never card data */
  preferredPayment?: PaymentMethod;
  createdAt: number;
}

/**
 * A place someone books to often.
 * Stores a label and a location — never anything that identifies a household
 * beyond the address the customer typed themselves.
 */
export interface SavedPlace {
  id: string;
  label: string;
  geo: Geo;
}

export interface Geo {
  lat: number;
  lng: number;
  /** human label, e.g. "Koramangala, Bengaluru" */
  areaName: string;
  /** free-text address the client typed or dictated */
  address?: string;
  /** lib/cities.ts ids — what search, matching and distance filter on */
  cityId?: string;
  localityId?: string;
}

/* ------------------------------------------------------------------- work */

export interface ScrapItem { material: string; approxKg: number; ratePerKg: number }

export interface Job {
  id: string;
  clientId: string;
  clientRole: Exclude<Role, 'worker'>;

  title: string;
  rawRequest: string;
  /** the language the request was spoken/typed in — never overwritten */
  lang: LangCode;

  category: CategoryId;
  serviceId?: string;

  /** answers the AI collected rather than assumed */
  whenText?: string;
  budgetMin?: number;
  budgetMax?: number;

  /* ---- booking request details, gathered BEFORE workers are shown ---- */
  /** photos of the problem — data URLs in this build, object storage later */
  photos?: string[];
  timePref?: TimePreference;
  /** epoch ms when timePref is 'scheduled' */
  scheduledAt?: number;
  duration?: DurationEstimate;
  /** workers the request was sent to */
  requestedWorkerIds?: string[];

  /**
   * Set when this is a recurring rota rather than a one-off visit — a shop
   * cleaner every Mon/Wed/Fri, a society guard on nights. See lib/shifts.ts.
   */
  shift?: ShiftPattern;
  /** how many people are needed per shift */
  staffCount?: number;

  /* ---- lifecycle timestamps, used by the cancellation policy ---- */
  requestedAt?: number;
  acceptedAt?: number;
  travelStartedAt?: number;
  startedAt?: number;
  completedAt?: number;

  cancellation?: Cancellation;

  urgency: Urgency;
  estimatedHours: number;
  geo: Geo;

  priceMin: number;
  priceMax: number;
  priceBasis: string;

  status: JobStatus;
  assignedWorkerId?: string;
  agreedAmount?: number;
  payment: Payment;

  isScrap?: boolean;
  scrapItems?: ScrapItem[];

  createdAt: number;
}

export interface Quote {
  id: string;
  jobId: string;
  workerId: string;
  amount: number;
  note: string;
  createdAt: number;
}

export type MessageKind = 'text' | 'voice' | 'quick';

export interface Message {
  id: string;
  jobId: string;
  fromRole: 'worker' | 'client';
  fromId: string;
  kind: MessageKind;
  /** for a voice note this is the transcript */
  text: string;
  lang: LangCode;
  durationSec?: number;
  createdAt: number;
}

/** A written review. Stars plus words — no derived score, no ranking. */
export interface Review {
  id: string;
  jobId: string;
  workerId: string;
  authorName: string;
  stars: number;
  text: string;
  /** quick tags the client tapped, e.g. 'punctual' */
  tags: string[];
  createdAt: number;
}

export interface SosEvent {
  id: string;
  jobId: string;
  at: number;
  by: 'worker' | 'client';
  lat?: number;
  lng?: number;
  resolved: boolean;
}

/* ---------------------------------------------------------------- session */

export interface Session {
  role: Role | null;
  id: string | null;
  lang: LangCode;
  /** true when signed in through a one-tap demo account */
  demo?: boolean;
}

export interface DB {
  workers: Worker[];
  clients: Client[];
  jobs: Job[];
  quotes: Quote[];
  messages: Message[];
  reviews: Review[];
  sos: SosEvent[];
  session: Session;
}
