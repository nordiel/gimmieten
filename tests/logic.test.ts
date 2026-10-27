import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CATEGORIES, TOPICS } from '../src/data/topics';
import { pickTopic } from '../src/lib/random';
import { selfAssessmentScore } from '../src/lib/score';
import { EXPLAIN_MS, RESEARCH_MS } from '../src/lib/rules';
import { createSession, sessionReducer } from '../src/lib/session';
import { EMPTY_STREAK, applyCompletion, daysBetween, liveStreak, streakFromDays } from '../src/lib/streak';
import { createTimer, deadline, formatClock, isExpired, pauseTimer, remainingMs, startTimer } from '../src/lib/timer';

describe('timer', () => {
  it('computes remaining time from timestamps', () => {
    const t = startTimer(createTimer(60_000), 1_000);
    assert.equal(remainingMs(t, 1_000), 60_000);
    assert.equal(remainingMs(t, 31_000), 30_000);
    // A long gap (inactive tab, refresh) is counted, never drifts.
    assert.equal(remainingMs(t, 500_000), 0);
    assert.equal(isExpired(t, 500_000), true);
  });

  it('pauses and resumes without losing or gaining time', () => {
    let t = startTimer(createTimer(60_000), 0);
    t = pauseTimer(t, 10_000);
    assert.equal(remainingMs(t, 999_999), 50_000);
    t = startTimer(t, 100_000);
    assert.equal(remainingMs(t, 105_000), 45_000);
  });

  it('ignores double starts and pausing a paused timer', () => {
    const t = startTimer(createTimer(60_000), 0);
    assert.equal(startTimer(t, 5_000), t);
    const p = pauseTimer(t, 5_000);
    assert.equal(pauseTimer(p, 9_000), p);
  });

  it('reports the deadline only while running', () => {
    let t = createTimer(60_000);
    assert.equal(deadline(t), null);
    t = startTimer(t, 1_000);
    assert.equal(deadline(t), 61_000);
    t = pauseTimer(t, 11_000);
    assert.equal(deadline(t), null);
    t = startTimer(t, 100_000);
    assert.equal(deadline(t), 150_000);
  });

  it('formats the clock rounding up', () => {
    assert.equal(formatClock(600_000), '10:00');
    assert.equal(formatClock(59_001), '1:00');
    assert.equal(formatClock(500), '0:01');
    assert.equal(formatClock(0), '0:00');
  });
});

describe('streaks', () => {
  it('counts consecutive days and ignores repeats on the same day', () => {
    let s = applyCompletion(EMPTY_STREAK, '2026-03-01');
    s = applyCompletion(s, '2026-03-01');
    s = applyCompletion(s, '2026-03-02');
    s = applyCompletion(s, '2026-03-02');
    s = applyCompletion(s, '2026-03-03');
    assert.deepEqual(s, { current: 3, longest: 3, lastDay: '2026-03-03' });
  });

  it('resets after a missed day but keeps the longest', () => {
    let s = streakFromDays(['2026-03-01', '2026-03-02', '2026-03-03']);
    s = applyCompletion(s, '2026-03-05');
    assert.deepEqual(s, { current: 1, longest: 3, lastDay: '2026-03-05' });
  });

  it('treats a streak as alive through yesterday only', () => {
    const s = streakFromDays(['2026-03-01', '2026-03-02']);
    assert.equal(liveStreak(s, '2026-03-02'), 2);
    assert.equal(liveStreak(s, '2026-03-03'), 2);
    assert.equal(liveStreak(s, '2026-03-04'), 0);
  });

  it('handles month and DST boundaries', () => {
    assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
    assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2);
    assert.equal(daysBetween('2025-12-31', '2026-01-01'), 1);
  });
});

describe('topics', () => {
  it('has 100+ topics with unique ids in every category', () => {
    assert.ok(TOPICS.length >= 100);
    assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length);
    for (const c of CATEGORIES) assert.ok(TOPICS.some((t) => t.category === c), c);
  });

  it('has a Spanish title and hint for every topic', () => {
    for (const t of TOPICS) assert.ok(t.title.es && t.hint?.es && t.title.es !== '', t.id);
  });

  it('avoids completed and skipped topics until the pool runs out', () => {
    const science = TOPICS.filter((t) => t.category === 'science');
    const completed = science.slice(0, -1).map((t) => t.id);
    for (let i = 0; i < 20; i++) {
      const pick = pickTopic(TOPICS, { category: 'science', completedIds: completed });
      assert.equal(pick?.id, science.at(-1)?.id);
    }
    // Everything completed: repeats are allowed, but never the topic being skipped.
    const all = science.map((t) => t.id);
    const avoid = [science[0]!.id];
    for (let i = 0; i < 20; i++) {
      const pick = pickTopic(TOPICS, { category: 'science', completedIds: all, avoidIds: avoid });
      assert.ok(pick && pick.category === 'science' && pick.id !== science[0]!.id);
    }
  });
});

describe('scoring', () => {
  it('averages ratings into a percentage', () => {
    assert.equal(selfAssessmentScore({ clarity: 5, accuracy: 5, confidence: 5, recall: 5 }), 100);
    assert.equal(selfAssessmentScore({ clarity: 4, accuracy: 3, confidence: 4, recall: 3 }), 70);
    assert.equal(selfAssessmentScore({ clarity: 1, accuracy: 1, confidence: 1, recall: 1 }), 20);
  });
});

describe('session flow', () => {
  it('runs setup → research → explain → results and wipes notes', () => {
    let s = sessionReducer(null, { type: 'new', id: 's1', topicId: TOPICS[0]!.id, now: 0 });
    assert.equal(s?.research.durationMs, 5 * 60_000);
    assert.equal(s?.explain.durationMs, 60_000);
    assert.equal(s?.explainMinutes, 1);
    assert.equal(RESEARCH_MS, 5 * 60_000);
    assert.equal(EXPLAIN_MS, 60_000);
    s = sessionReducer(s, { type: 'skip', topicId: TOPICS[1]!.id });
    assert.equal(s?.topicId, TOPICS[1]!.id);
    assert.deepEqual(s?.skippedTopicIds, [TOPICS[0]!.id]);

    s = sessionReducer(s, { type: 'startResearch', now: 0 });
    s = sessionReducer(s, { type: 'setNotes', notes: 'secret script' });
    assert.equal(s?.notes, 'secret script');
    // Skipping is locked once research has begun.
    assert.equal(sessionReducer(s, { type: 'skip', topicId: TOPICS[2]!.id }), s);

    s = sessionReducer(s, { type: 'finishResearch', now: 1_000 });
    assert.equal(s?.phase, 'explain');
    assert.equal(s?.notes, '');
    assert.equal(sessionReducer(s, { type: 'setNotes', notes: 'sneaky' })?.notes, '');

    s = sessionReducer(s, { type: 'startExplain', now: 2_000 });
    s = sessionReducer(s, { type: 'finishExplain', now: 3_000 });
    assert.equal(s?.phase, 'results');
    // A late expiry or double click doesn't move the session again.
    assert.equal(sessionReducer(s, { type: 'finishExplain', now: 4_000 }), s);
    assert.equal(sessionReducer(s, { type: 'finishResearch', now: 4_000 }), s);
  });

  it('locks ratings once saved', () => {
    let s: ReturnType<typeof sessionReducer> = { ...createSession('s2', TOPICS[0]!.id, 0), phase: 'results' };
    s = sessionReducer(s, { type: 'rate', key: 'clarity', value: 4 });
    s = sessionReducer(s, { type: 'markSaved', at: new Date(0).toISOString() });
    const saved = s;
    assert.equal(sessionReducer(s, { type: 'markSaved', at: new Date(1).toISOString() }), saved);
    assert.equal(sessionReducer(s, { type: 'rate', key: 'clarity', value: 1 })?.ratings.clarity, 4);
  });
});
