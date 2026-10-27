import type { TimerState } from '../types';

export function createTimer(durationMs: number): TimerState {
  return { durationMs, accumulatedMs: 0, runningSince: null, started: false };
}

export function elapsedMs(timer: TimerState, now: number): number {
  const live = timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince);
  return Math.min(timer.durationMs, timer.accumulatedMs + live);
}

export function remainingMs(timer: TimerState, now: number): number {
  return Math.max(0, timer.durationMs - elapsedMs(timer, now));
}

export function isRunning(timer: TimerState): boolean {
  return timer.runningSince !== null;
}

/** Epoch ms when a running timer hits zero; null while paused or not started. */
export function deadline(timer: TimerState): number | null {
  if (timer.runningSince === null) return null;
  return timer.runningSince + timer.durationMs - timer.accumulatedMs;
}

export function isExpired(timer: TimerState, now: number): boolean {
  return timer.started && remainingMs(timer, now) === 0;
}

export function startTimer(timer: TimerState, now: number): TimerState {
  if (timer.runningSince !== null || isExpired(timer, now)) return timer;
  return { ...timer, runningSince: now, started: true };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.runningSince === null) return timer;
  return { ...timer, accumulatedMs: elapsedMs(timer, now), runningSince: null };
}

/** Freeze the timer at its current position (used for early finishes). */
export function stopTimer(timer: TimerState, now: number): TimerState {
  return pauseTimer(timer, now);
}

/** Whole seconds remaining, rounded up so "0:01" shows until the very end. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function isTimerState(value: unknown): value is TimerState {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.durationMs === 'number' &&
    t.durationMs > 0 &&
    typeof t.accumulatedMs === 'number' &&
    t.accumulatedMs >= 0 &&
    (t.runningSince === null || typeof t.runningSince === 'number') &&
    typeof t.started === 'boolean'
  );
}
