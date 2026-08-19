import type { Job, Payment, PaymentMethod, PaymentStatus } from './types';

/* ===========================================================================
   PAYMENTS

   ⚠️  SIMULATED — no money moves. The UI says so on the payment screen.

   What is real here is the SHAPE. Every function below matches the Razorpay
   server flow one-to-one, so going live is replacing four function bodies with
   API calls and adding a webhook route. Nothing in the UI changes.

     createOrder()   → POST https://api.razorpay.com/v1/orders
     authorize()     → Razorpay Checkout on the client, returns payment_id
     capture()       → POST /v1/payments/:id/capture
     refund()        → POST /v1/payments/:id/refund

   Money is held by the platform between capture and release. That is the whole
   point of "Payment Protected": the worker knows the customer has actually
   paid before they travel, and the customer knows the money is not released
   until they confirm the work is done.

   Going live also requires: a Razorpay merchant account, KEY_ID and KEY_SECRET
   in server-only env vars (never NEXT_PUBLIC_), signature verification on the
   webhook, and RazorpayX or Route for paying workers out.
   =========================================================================== */

export interface MethodInfo {
  id: PaymentMethod;
  icon: string;
  /** i18n key for the label */
  key: string;
  /** money is held by the platform — cash cannot be */
  protectable: boolean;
  /** shown when the customer picks it */
  noteKey: string;
}

export const PAYMENT_METHODS: MethodInfo[] = [
  { id: 'upi',         icon: '🟣', key: 'y.upi',      protectable: true,  noteKey: 'y.noteProtected' },
  { id: 'gpay',        icon: '🅖', key: 'y.gpay',     protectable: true,  noteKey: 'y.noteProtected' },
  { id: 'phonepe',     icon: '🟪', key: 'y.phonepe',  protectable: true,  noteKey: 'y.noteProtected' },
  { id: 'paytm',       icon: '🔵', key: 'y.paytm',    protectable: true,  noteKey: 'y.noteProtected' },
  { id: 'card_debit',  icon: '💳', key: 'y.debit',    protectable: true,  noteKey: 'y.noteProtected' },
  { id: 'card_credit', icon: '💳', key: 'y.credit',   protectable: true,  noteKey: 'y.noteProtected' },
  { id: 'cash',        icon: '💵', key: 'y.cash',     protectable: false, noteKey: 'y.noteCash' },
];

export function methodInfo(id?: PaymentMethod): MethodInfo | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

export const EMPTY_PAYMENT: Payment = { status: 'unpaid', protected: false };

/** Deterministic reference so a demo never shows a different id on re-render. */
function ref(prefix: string, seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `${prefix}_${h.toString(36).padStart(8, '0').slice(0, 8)}`;
}

/** Razorpay: create an order once the customer has chosen a method. */
export async function createOrder(jobId: string, amount: number, method: PaymentMethod): Promise<Payment> {
  await new Promise((r) => setTimeout(r, 700));
  const info = methodInfo(method);
  if (method === 'cash') {
    // Cash cannot be protected. We say so rather than pretending.
    return { method, status: 'unpaid', amount, protected: false, updatedAt: Date.now() };
  }
  return {
    method,
    status: 'authorized',
    amount,
    orderRef: ref('order', jobId + method),
    protected: !!info?.protectable,
    updatedAt: Date.now(),
  };
}

/** Razorpay: capture. Money now sits with the platform, not the worker. */
export async function holdFunds(p: Payment): Promise<Payment> {
  await new Promise((r) => setTimeout(r, 600));
  if (p.method === 'cash') return p;
  return { ...p, status: 'held', protected: true, updatedAt: Date.now() };
}

/** Release to the worker — only after the customer confirms the work is done. */
export async function releaseFunds(p: Payment): Promise<Payment> {
  await new Promise((r) => setTimeout(r, 600));
  return { ...p, status: 'released', protected: false, updatedAt: Date.now() };
}

/** Refund, minus any cancellation fee that legitimately applies. */
export async function refund(p: Payment, keepFee = 0): Promise<Payment> {
  await new Promise((r) => setTimeout(r, 600));
  return {
    ...p,
    status: 'refunded',
    amount: Math.max(0, (p.amount ?? 0) - keepFee),
    protected: false,
    updatedAt: Date.now(),
  };
}

/** Cash is settled by hand; mark it so both sides see the same state. */
export function markCashPaid(p: Payment): Payment {
  return { ...p, status: 'released', protected: false, updatedAt: Date.now() };
}

/** i18n key describing the current state, for the status line. */
export function statusKey(s: PaymentStatus): string {
  return {
    unpaid: 'y.stUnpaid',
    authorized: 'y.stAuthorized',
    held: 'y.stHeld',
    released: 'y.stReleased',
    refunded: 'y.stRefunded',
  }[s];
}

/** The four trust indicators shown wherever money is discussed. */
export const TRUST_POINTS = [
  { icon: '🔒', key: 'ts.securePay' },
  { icon: '✅', key: 'ts.verifiedWorker' },
  { icon: '🛡️', key: 'ts.protected' },
  { icon: '🎧', key: 'ts.support' },
] as const;

export function amountFor(job: Job): number {
  return job.agreedAmount ?? Math.round((job.priceMin + job.priceMax) / 2);
}
