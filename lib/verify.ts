import type { Verification } from './types';

/* ===========================================================================
   IDENTITY VERIFICATION

   ⚠️  READ THIS BEFORE SHIPPING TO REAL USERS

   Real Aadhaar authentication is a licensed activity. Only an entity
   registered with UIDAI as an AUA/KUA (or working through one) may call the
   authentication APIs, and the Aadhaar Act 2016 plus the 2021 amendments
   place hard obligations on anyone who handles Aadhaar data — including a
   prohibition on storing the number itself in most circumstances.

   So this file SIMULATES verification. It is honest about that in the UI
   (see the 'v.simNote' string, shown on the verification screen).

   Two things here are production-real and should stay that way:
     1. We never accept, transmit or store the full number beyond this
        function's scope. Only the last four digits are returned.
     2. Verhoeff checksum validation is the genuine algorithm UIDAI uses, so
        obviously-invalid numbers are rejected before any network call.

   TO GO LIVE: replace verifyIdentity's body with a call to your KYC partner
   (DigiLocker, Signzy, Karza, IDfy, Cashfree Verification …). The signature
   and the return shape do not change, so no UI code is touched.
   =========================================================================== */

const D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];

/** The real Verhoeff check UIDAI uses. Catches typos and made-up numbers. */
export function isValidAadhaarFormat(raw: string): boolean {
  const n = raw.replace(/\D/g, '');
  if (n.length !== 12) return false;
  if (n[0] === '0' || n[0] === '1') return false; // Aadhaar never starts 0 or 1
  let c = 0;
  const digits = n.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) c = D[c][P[i % 8][digits[i]]];
  return c === 0;
}

export interface VerifyResult {
  verification: Verification;
  /** shown to the user; already localised by the caller */
  ok: boolean;
}

/**
 * Simulated identity check.
 * Deterministic: the same number always gives the same answer, so a demo
 * never contradicts itself. Numbers failing the checksum fail verification —
 * which means a judge typing 1234 5678 9012 sees a realistic failure state.
 */
export async function verifyIdentity(
  aadhaar: string,
  declaredName: string
): Promise<VerifyResult> {
  const digits = aadhaar.replace(/\D/g, '');
  await new Promise((r) => setTimeout(r, 1600)); // feels like a real round trip

  if (!isValidAadhaarFormat(digits)) {
    return {
      ok: false,
      verification: {
        status: 'failed',
        method: 'simulated',
        checkedAt: Date.now(),
        failureReason: 'checksum',
      },
    };
  }

  return {
    ok: true,
    verification: {
      status: 'verified',
      idLast4: digits.slice(-4),      // the ONLY part we keep
      idName: declaredName.trim() || undefined,
      method: 'simulated',
      checkedAt: Date.now(),
    },
  };
}

export const UNVERIFIED: Verification = { status: 'unverified', method: 'simulated' };

export function verificationTone(v: Verification): 'em' | 'gd' | 'red' | 'muted' {
  switch (v.status) {
    case 'verified': return 'em';
    case 'pending':  return 'gd';
    case 'failed':   return 'red';
    default:         return 'muted';
  }
}
