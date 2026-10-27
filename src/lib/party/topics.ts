import type { Topic } from '../../types';
import { pickTopic } from '../random';
import type { RoomSettings } from './rules';

export interface DealOptions {
  playerIds: string[];
  topics: readonly Topic[];
  settings: Pick<RoomSettings, 'topicMode' | 'category'>;
  /** Topics each player has already completed, avoided while fresh ones remain. */
  completedByPlayer?: Record<string, readonly string[]>;
  rand?: () => number;
}

/**
 * Deal a topic to every player: a different one each in "own" mode, or one
 * for everybody in "shared" mode. Returns playerId → topicId.
 */
export function dealTopics(options: DealOptions): Record<string, string> {
  const { playerIds, topics, settings, completedByPlayer = {}, rand } = options;
  const dealt: Record<string, string> = {};

  if (settings.topicMode === 'shared') {
    // Prefer a topic nobody in the room has done yet.
    const completedByAnyone = playerIds.flatMap((id) => completedByPlayer[id] ?? []);
    const topic = pickTopic(topics, { category: settings.category, completedIds: completedByAnyone, rand });
    if (topic) for (const id of playerIds) dealt[id] = topic.id;
    return dealt;
  }

  for (const id of playerIds) {
    const topic = pickTopic(topics, {
      category: settings.category,
      completedIds: completedByPlayer[id] ?? [],
      // Topics already dealt to others come first in the avoid list, so no two players share one.
      avoidIds: Object.values(dealt),
      rand,
    });
    if (topic) dealt[id] = topic.id;
  }
  return dealt;
}

/** Replace one player's topic (an own-mode skip) without colliding with anyone else's. */
export function redealTopic(
  dealt: Record<string, string>,
  playerId: string,
  options: Omit<DealOptions, 'playerIds'>,
): Record<string, string> {
  const current = dealt[playerId];
  const topic = pickTopic(options.topics, {
    category: options.settings.category,
    completedIds: options.completedByPlayer?.[playerId] ?? [],
    avoidIds: Object.values(dealt),
    rand: options.rand,
  });
  if (!topic || topic.id === current) return dealt;
  return { ...dealt, [playerId]: topic.id };
}
