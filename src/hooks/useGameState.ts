import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { TOPICS, getTopic } from '../data/topics';
import { createId } from '../lib/id';
import { pickTopic } from '../lib/random';
import { isCompleteRatings, selfAssessmentScore } from '../lib/score';
import { sessionReducer, type SessionAction } from '../lib/session';
import {
  clearProgress,
  loadHistory,
  loadPrefs,
  loadSession,
  loadStreak,
  saveHistory,
  savePrefs,
  saveSession,
  saveStreak,
} from '../lib/storage';
import { EMPTY_STREAK, applyCompletion, liveStreak, toDayKey } from '../lib/streak';
import type { AlertPrefs, CategoryId, HistoryEntry, Locale, Prefs, StreakRecord } from '../types';

interface Progress {
  history: HistoryEntry[];
  streak: StreakRecord;
}

export interface ProgressStats {
  completed: number;
  topicsExplored: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number | null;
  completedToday: boolean;
}

function loadProgress(): Progress {
  const history = loadHistory();
  return { history, streak: loadStreak(history) };
}

export function useGameState() {
  const [session, dispatchSession] = useReducer(sessionReducer, null, loadSession);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  useEffect(() => saveSession(session), [session]);
  useEffect(() => {
    saveHistory(progress.history);
    saveStreak(progress.streak);
  }, [progress]);
  useEffect(() => savePrefs(prefs), [prefs]);

  const dispatch = useCallback((action: SessionAction) => dispatchSession(action), []);

  const completedIds = useMemo(() => progress.history.map((h) => h.topicId), [progress.history]);

  const newChallenge = useCallback(() => {
    const topic = pickTopic(TOPICS, {
      category: prefs.category,
      completedIds,
      avoidIds: session ? [session.topicId] : [],
    });
    if (!topic) return;
    dispatchSession({
      type: 'new',
      id: createId(),
      topicId: topic.id,
      now: Date.now(),
    });
  }, [prefs.category, completedIds, session]);

  const skipTopic = useCallback(() => {
    if (!session || session.phase !== 'setup') return;
    const topic = pickTopic(TOPICS, {
      category: prefs.category,
      completedIds,
      avoidIds: [session.topicId, ...session.skippedTopicIds],
    });
    if (topic) dispatchSession({ type: 'skip', topicId: topic.id });
  }, [prefs.category, completedIds, session]);

  const saveResult = useCallback(() => {
    if (!session || session.phase !== 'results' || session.savedAt !== null) return;
    if (!isCompleteRatings(session.ratings)) return;
    const topic = getTopic(session.topicId);
    if (!topic) return;

    const now = new Date();
    const entry: HistoryEntry = {
      id: session.id,
      topicId: topic.id,
      topicTitle: topic.title.en,
      category: topic.category,
      explainMinutes: session.explainMinutes,
      ratings: session.ratings,
      score: selfAssessmentScore(session.ratings),
      completedAt: now.toISOString(),
      day: toDayKey(now),
    };
    // The functional update keeps a double click from adding the same session twice.
    setProgress((prev) =>
      prev.history.some((h) => h.id === entry.id)
        ? prev
        : { history: [...prev.history, entry], streak: applyCompletion(prev.streak, entry.day) },
    );
    dispatchSession({ type: 'markSaved', at: entry.completedAt });
  }, [session]);

  const endSession = useCallback(() => dispatchSession({ type: 'clear' }), []);

  const setCategory = useCallback((category: CategoryId | 'all') => setPrefs((p) => ({ ...p, category })), []);
  const setLocale = useCallback((locale: Locale) => setPrefs((p) => ({ ...p, locale })), []);
  const setAlerts = useCallback((patch: Partial<AlertPrefs>) => setPrefs((p) => ({ ...p, ...patch })), []);

  const resetProgress = useCallback(() => {
    clearProgress();
    setProgress({ history: [], streak: EMPTY_STREAK });
  }, []);

  const today = toDayKey(new Date());
  const stats = useMemo<ProgressStats>(() => {
    const { history, streak } = progress;
    const total = history.reduce((sum, h) => sum + h.score, 0);
    return {
      completed: history.length,
      topicsExplored: new Set(history.map((h) => h.topicId)).size,
      currentStreak: liveStreak(streak, today),
      longestStreak: streak.longest,
      averageScore: history.length ? Math.round(total / history.length) : null,
      completedToday: streak.lastDay === today,
    };
  }, [progress, today]);

  return {
    session,
    dispatch,
    history: progress.history,
    stats,
    prefs,
    newChallenge,
    skipTopic,
    saveResult,
    endSession,
    setCategory,
    setLocale,
    setAlerts,
    resetProgress,
  };
}

export type GameState = ReturnType<typeof useGameState>;
