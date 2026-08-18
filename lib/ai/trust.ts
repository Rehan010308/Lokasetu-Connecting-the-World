import type { Review, TrustScore } from '../types';

export const NEW_WORKER_TRUST: TrustScore = {
  reliability: 0, skillQuality: 0, professionalism: 0, overall: 0, reviewCount: 0,
};

/**
 * AI FEATURE #7 - Turn three yes/no questions into a reputation score.
 * Residents answer three taps; we derive three separate trust dimensions so a
 * worker who is skilled but sometimes late is described accurately instead of
 * being flattened into one star rating.
 */
export function computeTrust(reviews: Review[]): TrustScore {
  if (!reviews.length) return { ...NEW_WORKER_TRUST };

  const n = reviews.length;
  const pct = (f: (r: Review) => boolean) => reviews.filter(f).length / n;

  const reliability = round1(1 + pct((r) => r.punctual) * 4);
  const skillQuality = round1(1 + pct((r) => r.satisfactory) * 4);
  const professionalism = round1(1 + pct((r) => r.hireAgain) * 4);
  const overall = round1((reliability + skillQuality + professionalism) / 3);

  return { reliability, skillQuality, professionalism, overall, reviewCount: n };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
