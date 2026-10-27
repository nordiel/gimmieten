import type { RatingKey, Ratings } from '../types';

export const RATING_KEYS: RatingKey[] = ['clarity', 'accuracy', 'confidence', 'recall'];

export function isCompleteRatings(ratings: Partial<Ratings>): ratings is Ratings {
  return RATING_KEYS.every((key) => isRatingValue(ratings[key]));
}

export function isRatingValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Average of the four 1–5 ratings, as a percentage of the maximum (20–100). */
export function selfAssessmentScore(ratings: Ratings): number {
  const total = RATING_KEYS.reduce((sum, key) => sum + ratings[key], 0);
  return Math.round((total / RATING_KEYS.length / 5) * 100);
}

/** Which of the five celebratory messages fits a score, from 0 (lowest) to 4. */
export function scoreTier(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score >= 90) return 4;
  if (score >= 75) return 3;
  if (score >= 55) return 2;
  if (score >= 35) return 1;
  return 0;
}
