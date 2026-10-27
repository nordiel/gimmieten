import { getTopic, isCategoryId } from '../data/topics';
import { detectLocale, isLocale } from '../i18n';
import type { ChallengeSession, HistoryEntry, Phase, Prefs, StreakRecord } from '../types';
import { RATING_KEYS, isCompleteRatings, isRatingValue } from './score';
import { isDayKey, streakFromDays } from './streak';
import { isTimerState } from './timer';

const KEYS = {
  history: 'gimmiefive.history.v1',
  streak: 'gimmiefive.streak.v1',
  session: 'gimmiefive.session.v1',
  prefs: 'gimmiefive.prefs.v1',
} as const;

const PHASES: Phase[] = ['setup', 'research', 'explain', 'results'];

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the app keeps working in memory.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore: nothing to clean up if storage is unavailable.
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Minutes of explanation. Older saves used 1, 2, or 5, so accept any sensible whole number. */
function isMinutes(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 60;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

// ---------- History ----------

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.topicId === 'string' &&
    typeof value.topicTitle === 'string' &&
    isCategoryId(value.category) &&
    isMinutes(value.explainMinutes) &&
    isObject(value.ratings) &&
    isCompleteRatings(value.ratings) &&
    typeof value.score === 'number' &&
    isIsoDate(value.completedAt) &&
    isDayKey(value.day)
  );
}

export function loadHistory(): HistoryEntry[] {
  const raw = readJson(KEYS.history);
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  // Drop malformed or duplicate rows rather than discarding the whole history.
  return raw.filter((entry): entry is HistoryEntry => {
    if (!isHistoryEntry(entry) || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

export function saveHistory(history: HistoryEntry[]): void {
  writeJson(KEYS.history, history);
}

// ---------- Streak ----------

function isStreakRecord(value: unknown): value is StreakRecord {
  if (!isObject(value)) return false;
  return (
    Number.isInteger(value.current) &&
    (value.current as number) >= 0 &&
    Number.isInteger(value.longest) &&
    (value.longest as number) >= (value.current as number) &&
    (value.lastDay === null || isDayKey(value.lastDay))
  );
}

/** Load the stored streak, rebuilding it from history if it is missing or corrupt. */
export function loadStreak(history: HistoryEntry[]): StreakRecord {
  const raw = readJson(KEYS.streak);
  if (isStreakRecord(raw)) return raw;
  return streakFromDays(history.map((h) => h.day));
}

export function saveStreak(streak: StreakRecord): void {
  writeJson(KEYS.streak, streak);
}

// ---------- Active session ----------

function isSession(value: unknown): value is ChallengeSession {
  if (!isObject(value)) return false;
  const ratings = value.ratings;
  return (
    typeof value.id === 'string' &&
    typeof value.topicId === 'string' &&
    getTopic(value.topicId) !== undefined &&
    isMinutes(value.explainMinutes) &&
    PHASES.includes(value.phase as Phase) &&
    isTimerState(value.research) &&
    isTimerState(value.explain) &&
    typeof value.notes === 'string' &&
    Array.isArray(value.skippedTopicIds) &&
    value.skippedTopicIds.every((id) => typeof id === 'string') &&
    isObject(ratings) &&
    RATING_KEYS.every((key) => ratings[key] === undefined || isRatingValue(ratings[key])) &&
    (value.savedAt === null || isIsoDate(value.savedAt)) &&
    isIsoDate(value.createdAt)
  );
}

export function loadSession(): ChallengeSession | null {
  const raw = readJson(KEYS.session);
  if (!isSession(raw)) {
    if (raw !== undefined) remove(KEYS.session);
    return null;
  }
  // Notes only belong to the research phase; never resurrect them later.
  return raw.phase === 'research' || raw.phase === 'setup' ? raw : { ...raw, notes: '' };
}

export function saveSession(session: ChallengeSession | null): void {
  if (session === null) remove(KEYS.session);
  else writeJson(KEYS.session, session);
}

// ---------- Preferences ----------

export function loadPrefs(): Prefs {
  const raw = readJson(KEYS.prefs);
  const prefs = isObject(raw) ? raw : {};
  return {
    category: prefs.category === 'all' || isCategoryId(prefs.category) ? prefs.category : 'all',
    // No saved choice yet: follow the browser's language.
    locale: isLocale(prefs.locale) ? prefs.locale : detectLocale(),
    sound: typeof prefs.sound === 'boolean' ? prefs.sound : true,
    notify: typeof prefs.notify === 'boolean' ? prefs.notify : false,
  };
}

export function savePrefs(prefs: Prefs): void {
  writeJson(KEYS.prefs, prefs);
}

export function clearProgress(): void {
  remove(KEYS.history);
  remove(KEYS.streak);
}
