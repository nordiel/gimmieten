import type { ChallengeSession, RatingKey } from '../types';
import { EXPLAIN_MINUTES, EXPLAIN_MS, RESEARCH_MS } from './rules';
import { createTimer, pauseTimer, startTimer, stopTimer } from './timer';

export type SessionAction =
  | { type: 'new'; id: string; topicId: string; now: number }
  | { type: 'skip'; topicId: string }
  | { type: 'startResearch'; now: number }
  | { type: 'pauseResearch'; now: number }
  | { type: 'finishResearch'; now: number }
  | { type: 'setNotes'; notes: string }
  | { type: 'startExplain'; now: number }
  | { type: 'pauseExplain'; now: number }
  | { type: 'finishExplain'; now: number }
  | { type: 'rate'; key: RatingKey; value: number }
  | { type: 'markSaved'; at: string }
  | { type: 'clear' };

export function createSession(id: string, topicId: string, now: number): ChallengeSession {
  return {
    id,
    topicId,
    explainMinutes: EXPLAIN_MINUTES,
    phase: 'setup',
    research: createTimer(RESEARCH_MS),
    explain: createTimer(EXPLAIN_MS),
    notes: '',
    skippedTopicIds: [],
    ratings: {},
    savedAt: null,
    createdAt: new Date(now).toISOString(),
  };
}

/**
 * Every transition is guarded by the current phase, so repeated or stale
 * dispatches (double clicks, an expiry racing a button press) are no-ops.
 */
export function sessionReducer(
  state: ChallengeSession | null,
  action: SessionAction,
): ChallengeSession | null {
  if (action.type === 'new') {
    return createSession(action.id, action.topicId, action.now);
  }
  if (action.type === 'clear') return null;
  if (state === null) return state;

  switch (action.type) {
    case 'skip':
      if (state.phase !== 'setup' || action.topicId === state.topicId) return state;
      return {
        ...state,
        topicId: action.topicId,
        skippedTopicIds: [...state.skippedTopicIds, state.topicId],
      };

    case 'startResearch':
      if (state.phase !== 'setup' && state.phase !== 'research') return state;
      return { ...state, phase: 'research', research: startTimer(state.research, action.now) };

    case 'pauseResearch':
      if (state.phase !== 'research') return state;
      return { ...state, research: pauseTimer(state.research, action.now) };

    case 'finishResearch':
      if (state.phase !== 'research') return state;
      // Notes are destroyed here so the explanation phase works from recall alone.
      return { ...state, phase: 'explain', research: stopTimer(state.research, action.now), notes: '' };

    case 'setNotes':
      if (state.phase !== 'research') return state;
      return { ...state, notes: action.notes };

    case 'startExplain':
      if (state.phase !== 'explain') return state;
      return { ...state, explain: startTimer(state.explain, action.now) };

    case 'pauseExplain':
      if (state.phase !== 'explain') return state;
      return { ...state, explain: pauseTimer(state.explain, action.now) };

    case 'finishExplain':
      if (state.phase !== 'explain') return state;
      return { ...state, phase: 'results', explain: stopTimer(state.explain, action.now) };

    case 'rate':
      if (state.phase !== 'results' || state.savedAt !== null) return state;
      return { ...state, ratings: { ...state.ratings, [action.key]: action.value } };

    case 'markSaved':
      if (state.phase !== 'results' || state.savedAt !== null) return state;
      return { ...state, savedAt: action.at };
  }
}
