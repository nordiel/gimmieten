export type CategoryId =
  | 'science'
  | 'psychology'
  | 'technology'
  | 'history'
  | 'business'
  | 'art'
  | 'gaming'
  | 'philosophy'
  | 'mysteries';

export type Locale = 'en' | 'es';

export type LocalizedText = Record<Locale, string>;

export interface Topic {
  /** Stable across languages, so history survives a language switch. */
  id: string;
  title: LocalizedText;
  category: CategoryId;
  hint?: LocalizedText;
}

export type Phase = 'setup' | 'research' | 'explain' | 'results';

/**
 * A pausable countdown described purely by timestamps, so the remaining time
 * can be recomputed from the wall clock at any moment (no per-tick decrement).
 */
export interface TimerState {
  durationMs: number;
  /** Elapsed time banked from previous running stretches. */
  accumulatedMs: number;
  /** Epoch ms when the current running stretch began; null when not running. */
  runningSince: number | null;
  /** True once the timer has been started at least once. */
  started: boolean;
}

export type RatingKey = 'clarity' | 'accuracy' | 'confidence' | 'recall';

export type Ratings = Record<RatingKey, number>;

export interface ChallengeSession {
  id: string;
  topicId: string;
  /** Explanation length in minutes, recorded with the rules in force at the time. */
  explainMinutes: number;
  phase: Phase;
  research: TimerState;
  explain: TimerState;
  /** Research notes. Wiped when research ends so they can never reach the explanation UI. */
  notes: string;
  /** Topics skipped during this session, so a skip doesn't immediately re-roll them. */
  skippedTopicIds: string[];
  ratings: Partial<Ratings>;
  savedAt: string | null;
  createdAt: string;
}

export interface HistoryEntry {
  /** Same as the session id; used to reject duplicate submissions. */
  id: string;
  topicId: string;
  /** English title at save time; a fallback if the topic is later removed. */
  topicTitle: string;
  category: CategoryId;
  /** Explanation length in minutes, recorded with the rules in force at the time. */
  explainMinutes: number;
  ratings: Ratings;
  score: number;
  completedAt: string;
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
}

export interface StreakRecord {
  current: number;
  longest: number;
  lastDay: string | null;
}

export interface Prefs {
  category: CategoryId | 'all';
  locale: Locale;
  /** Chime when a timer runs out. */
  sound: boolean;
  /** Browser notification when a timer runs out in a hidden tab (needs permission). */
  notify: boolean;
}

export type AlertPrefs = Pick<Prefs, 'sound' | 'notify'>;
