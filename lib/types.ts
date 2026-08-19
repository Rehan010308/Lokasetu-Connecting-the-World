/* ===========================================================================
   KaamSetu V2 domain model.
   These interfaces are the database schema. When you move off localStorage,
   each one becomes a table with the same columns.
   =========================================================================== */

import type { CategoryId } from './catalog';
export type { CategoryId } from './catalog';

export type LangCode =
  | 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa';

/** Who is using the app. Each role has its own onboarding and dashboard. */
export type Role = 'worker' | 'customer' | 'society' | 'business';

export type Availability = 'today' | 'weekdays' | 'anytime';
export type Urgency = 'emergency' | 'today' | 'this_week' | 'flexible';

export type JobStatus =
  | 'draft'        // being composed, AI still asking follow-ups
  | 'open'         // published, waiting for workers
  | 'assigned'     // a worker accepted
  | 'on_the_way'   // worker travelling — this is when SOS and tracking matter
  | 'working'      // worker on site
  | 'worker_done'  // worker says finished, awaiting client confirmation
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'cash';
export type PaymentStatus = 'pending' | 'paid';

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
  experienceYears: number;

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
  createdAt: number;
}

export interface Geo {
  lat: number;
  lng: number;
  areaName: string;
  /** free-text address the client typed or dictated */
  address?: string;
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

  urgency: Urgency;
  estimatedHours: number;
  geo: Geo;

  priceMin: number;
  priceMax: number;
  priceBasis: string;

  status: JobStatus;
  assignedWorkerId?: string;
  agreedAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;

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
