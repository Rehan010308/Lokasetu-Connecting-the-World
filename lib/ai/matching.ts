import type { Job, Worker } from '../types';
import { distanceKm, proximityBand } from '../geo';

export interface MatchResult {
  worker: Worker;
  score: number;              // 0-100
  km: number;
  reasons: string[];
  breakdown: {
    skill: number;
    distance: number;
    availability: number;
    trust: number;
    experience: number;
    language: number;
  };
}

/**
 * AI FEATURE #4 + #5 - Worker ranking with hyperlocal weighting.
 *
 * This is an explainable weighted score, which is deliberately better than a
 * black box for a trust-critical marketplace: every card can show WHY a worker
 * ranked where they did. Phase 2 can add a semantic skill-similarity term from
 * Claude (or embeddings) and keep everything else identical.
 *
 * Weights (total 100):
 *   skill match        35
 *   distance           25
 *   availability       10
 *   trust / ratings    15
 *   experience         10
 *   shared language     5
 */
export function rankWorkers(job: Job, workers: Worker[]): MatchResult[] {
  const results: MatchResult[] = [];

  for (const w of workers) {
    const km = distanceKm(job.geo, w.geo);
    // A worker never sees jobs outside the radius they chose.
    if (km > w.radiusKm) continue;

    const reasons: string[] = [];

    // --- skill (35) ---
    let skill = 0;
    if (w.category === job.category) {
      skill = 28;
      reasons.push('Same trade');
    } else {
      skill = 6;
    }
    const overlap = w.skills.filter((s) =>
      job.skills.some((js) => js.toLowerCase() === s.toLowerCase())
    );
    if (overlap.length) {
      skill += Math.min(7, overlap.length * 4);
      reasons.push(`Does ${overlap[0].toLowerCase()}`);
    }

    // --- distance (25) : the hyperlocal priority bands ---
    const band = proximityBand(km);
    const distance =
      band === 'high' ? 25 : band === 'medium' ? 17 : band === 'low' ? 9 : 0;
    if (band === 'high') reasons.push('Very close by');

    // --- availability (10) ---
    const availability =
      w.availability === 'anytime' ? 10 : w.availability === 'weekdays' ? 7 : 8;
    if (job.urgency === 'emergency' && w.availability === 'anytime') {
      reasons.push('Available right now');
    }

    // --- trust (15) ---
    const trust = w.trust.reviewCount === 0 ? 7.5 : (w.trust.overall / 5) * 15;
    if (w.trust.reviewCount >= 3 && w.trust.overall >= 4.5) {
      reasons.push(`Rated ${w.trust.overall.toFixed(1)} by ${w.trust.reviewCount} residents`);
    }

    // --- experience (10) ---
    const experience = Math.min(10, w.experienceYears * 1.4);
    if (w.experienceYears >= 5) reasons.push(`${w.experienceYears} years experience`);

    // --- language (5) ---
    const language = 5; // every conversation is auto-translated, so never a blocker

    const score = Math.round(skill + distance + availability + trust + experience + language);

    results.push({
      worker: w,
      score: Math.min(100, score),
      km,
      reasons: reasons.slice(0, 3),
      breakdown: { skill, distance, availability, trust, experience, language },
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
