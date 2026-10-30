/** A uniformly random speaking order (Fisher–Yates). */
export function shuffleOrder(playerIds: readonly string[], rand: () => number = Math.random): string[] {
  const order = [...playerIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export interface TurnState {
  order: string[];
  /** Index into `order` of the current speaker. */
  turn: number;
  /** Speakers already moved to the end once for being absent. */
  deferredIds: string[];
}

export type AbsentOutcome = 'deferred' | 'skipped';

/**
 * The current speaker didn't show up: move them to the end the first time,
 * skip them the second time.
 */
export function handleAbsentSpeaker(state: TurnState): TurnState & { outcome: AbsentOutcome } {
  const speaker = state.order[state.turn];
  if (speaker === undefined) return { ...state, outcome: 'skipped' };

  if (state.deferredIds.includes(speaker)) {
    return { ...state, turn: state.turn + 1, outcome: 'skipped' };
  }
  const order = [...state.order.slice(0, state.turn), ...state.order.slice(state.turn + 1), speaker];
  // The next speaker slides into this index, so `turn` stays put.
  return { order, turn: state.turn, deferredIds: [...state.deferredIds, speaker], outcome: 'deferred' };
}

export function currentSpeaker(state: Pick<TurnState, 'order' | 'turn'>): string | undefined {
  return state.order[state.turn];
}

export function isLastTurn(state: Pick<TurnState, 'order' | 'turn'>): boolean {
  return state.turn >= state.order.length - 1;
}
