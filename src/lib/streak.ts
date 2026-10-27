import type { StreakRecord } from '../types';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day for a date, as YYYY-MM-DD. */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && DAY_RE.test(value);
}

/** Whole days from a to b. Computed in UTC so DST shifts can't skew it. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export const EMPTY_STREAK: StreakRecord = { current: 0, longest: 0, lastDay: null };

/** Record a completion on `day`. Several completions on one day count once. */
export function applyCompletion(streak: StreakRecord, day: string): StreakRecord {
  if (streak.lastDay === null) {
    return { current: 1, longest: Math.max(1, streak.longest), lastDay: day };
  }
  const gap = daysBetween(streak.lastDay, day);
  // Same day, or the clock moved backwards: nothing new to count.
  if (gap <= 0) return streak;
  const current = gap === 1 ? streak.current + 1 : 1;
  return { current, longest: Math.max(streak.longest, current), lastDay: day };
}

/** The streak as it stands today: still alive if the last completion was today or yesterday. */
export function liveStreak(streak: StreakRecord, today: string): number {
  if (streak.lastDay === null) return 0;
  const gap = daysBetween(streak.lastDay, today);
  return gap <= 1 ? streak.current : 0;
}

/** Rebuild a streak record from completion days (used when stored data is missing or invalid). */
export function streakFromDays(days: string[]): StreakRecord {
  const unique = [...new Set(days.filter(isDayKey))].sort();
  return unique.reduce(applyCompletion, EMPTY_STREAK);
}
