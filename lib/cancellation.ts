import type { Job } from './types';

/* ===========================================================================
   CANCELLATION POLICY

   Stated in full, in the customer's language, on the confirmation screen —
   before they need it. No hidden conditions, no fee that appears only at the
   moment you try to cancel.

   The rule that matters: a worker's *travel* is the thing that costs them.
   Cancelling before they set off is free, always. Once they are on the road,
   a small fee compensates the trip. That is the whole policy.
   =========================================================================== */

export type CancelActor = 'client' | 'worker';

export interface CancelTerms {
  /** rupees the customer would be charged if they cancelled right now */
  fee: number;
  /** i18n key explaining why */
  reasonKey: string;
  /** true when nothing would be charged */
  free: boolean;
  /** i18n key for what happens next */
  nextKey: string;
}

/** Capped and proportionate — never more than ₹100 or 20% of the estimate. */
const FEE_CAP = 100;
const FEE_RATE = 0.2;

export function travelFee(job: Job): number {
  const estimate = job.agreedAmount ?? Math.round((job.priceMin + job.priceMax) / 2);
  return Math.min(FEE_CAP, Math.round((estimate * FEE_RATE) / 10) * 10);
}

/**
 * What cancelling costs, given who is cancelling and where the job has got to.
 * Pure function of the job — call it to display the policy AND to apply it, so
 * the two can never disagree.
 */
export function cancelTerms(job: Job, by: CancelActor): CancelTerms {
  if (by === 'worker') {
    return {
      fee: 0,
      free: true,
      reasonKey: 'cx.workerCancel',
      nextKey: 'cx.replacementOffered',
    };
  }

  switch (job.status) {
    case 'draft':
    case 'requested':
      return { fee: 0, free: true, reasonKey: 'cx.beforeAccept', nextKey: 'cx.fullRefund' };

    case 'accepted':
      // Accepted but not yet travelling — still free.
      return { fee: 0, free: true, reasonKey: 'cx.beforeTravel', nextKey: 'cx.fullRefund' };

    case 'on_the_way':
      return { fee: travelFee(job), free: false, reasonKey: 'cx.afterTravel', nextKey: 'cx.partialRefund' };

    case 'working':
      return { fee: travelFee(job), free: false, reasonKey: 'cx.workStarted', nextKey: 'cx.partialRefund' };

    default:
      return { fee: 0, free: true, reasonKey: 'cx.notCancellable', nextKey: 'cx.contactSupport' };
  }
}

export function canCancel(job: Job, by: CancelActor): boolean {
  if (by === 'worker') return ['accepted', 'on_the_way', 'working'].includes(job.status);
  return ['draft', 'requested', 'accepted', 'on_the_way', 'working'].includes(job.status);
}

/** The policy rows shown up-front on every confirmed booking. */
export const POLICY_ROWS = [
  { icon: '✅', whenKey: 'cx.rowBeforeAccept', costKey: 'cx.costFree' },
  { icon: '✅', whenKey: 'cx.rowBeforeTravel', costKey: 'cx.costFree' },
  { icon: '⚠️', whenKey: 'cx.rowAfterTravel', costKey: 'cx.costTravel' },
  { icon: '🔄', whenKey: 'cx.rowWorkerCancels', costKey: 'cx.costNoneReplace' },
] as const;
