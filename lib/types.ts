// ---------------------------------------------------------------------------
// KaamSetu domain model
// Keep this file as the single source of truth. When you move from the
// localStorage store to a real database (Postgres / Supabase / Firebase),
// these same shapes become your table rows.
// ---------------------------------------------------------------------------

export type LangCode = 'en' | 'hi' | 'ta' | 'te' | 'ml' | 'kn';

export type Availability = 'today' | 'weekdays' | 'anytime';

export type JobStatus =
  | 'open'            // posted, waiting for quotes
  | 'assigned'        // a worker has been hired
  | 'worker_done'     // worker marked complete, awaiting resident confirmation
  | 'completed'       // resident confirmed + rated
  | 'cancelled';

export type PaymentMethod = 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'cash';
export type PaymentStatus = 'pending' | 'paid';
export type Urgency = 'emergency' | 'today' | 'this_week' | 'flexible';

export type CategoryId =
  | 'electrician'
  | 'plumber'
  | 'carpenter'
  | 'painter'
  | 'maid'
  | 'cook'
  | 'barber'
  | 'raddiwala'
  | 'shop_assistant'
  | 'other';

export interface Geo {
  lat: number;
  lng: number;
  areaName: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  lang: LangCode;
  category: CategoryId;
  skills: string[];
  experienceYears: number;
  rawSpeech: string;      // what they actually said - the raw voice transcript
  summary: string;        // AI-generated one-line "resume"
  geo: Geo;
  radiusKm: number;
  availability: Availability;
  jobsDone: number;
  trust: TrustScore;
  createdAt: number;
}

export interface TrustScore {
  reliability: number;      // 0-5
  skillQuality: number;     // 0-5
  professionalism: number;  // 0-5
  overall: number;          // 0-5
  reviewCount: number;
}

export interface Resident {
  id: string;
  name: string;
  phone: string;
  lang: LangCode;
  geo: Geo;
  createdAt: number;
}

export interface ScrapItem {
  material: string;         // Newspaper / Cardboard / Plastic / Metal / Electronics
  approxKg: number;
  ratePerKg: number;
}

export interface Job {
  id: string;
  residentId: string;
  title: string;
  rawRequest: string;       // exactly what the resident typed/said
  lang: LangCode;
  category: CategoryId;
  skills: string[];
  urgency: Urgency;
  estimatedHours: number;
  geo: Geo;
  priceMin: number;         // AI suggested range
  priceMax: number;
  priceBasis: string;       // human-readable explanation of the estimate
  status: JobStatus;
  assignedWorkerId?: string;
  agreedAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  isScrap?: boolean;
  scrapItems?: ScrapItem[];
  scrapPhoto?: string;      // data URL (demo only)
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

export interface Message {
  id: string;
  jobId: string;
  fromRole: 'worker' | 'resident';
  fromId: string;
  text: string;             // original text, in the sender's language
  lang: LangCode;
  createdAt: number;
}

export interface Review {
  id: string;
  jobId: string;
  workerId: string;
  punctual: boolean;
  satisfactory: boolean;
  hireAgain: boolean;
  createdAt: number;
}

export interface Session {
  role: 'worker' | 'resident' | null;
  id: string | null;
  lang: LangCode;
}

export interface DB {
  workers: Worker[];
  residents: Resident[];
  jobs: Job[];
  quotes: Quote[];
  messages: Message[];
  reviews: Review[];
  session: Session;
}
