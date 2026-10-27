import type { CategoryId, Topic } from '../types';

export function pickOne<T>(items: readonly T[], rand: () => number = Math.random): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rand() * items.length)];
}

export interface PickOptions {
  category: CategoryId | 'all';
  /** Topics already completed, avoided while fresh ones remain. */
  completedIds: Iterable<string>;
  /** Topics skipped this session plus the one on screen, avoided first. */
  avoidIds?: Iterable<string>;
  rand?: () => number;
}

/**
 * Pick a topic, preferring ones never completed and not just skipped. Each
 * fallback widens the pool, so the user only sees a repeat once fresh topics
 * in their chosen category run out.
 */
export function pickTopic(topics: readonly Topic[], options: PickOptions): Topic | undefined {
  const { category, rand = Math.random } = options;
  const completed = new Set(options.completedIds);
  const avoid = new Set(options.avoidIds ?? []);
  const inCategory = category === 'all' ? topics : topics.filter((t) => t.category === category);
  const pool = inCategory.length > 0 ? inCategory : topics;

  const tiers = [
    pool.filter((t) => !completed.has(t.id) && !avoid.has(t.id)),
    pool.filter((t) => !avoid.has(t.id)),
    pool,
  ];
  const tier = tiers.find((candidates) => candidates.length > 0) ?? [];
  return pickOne(tier, rand);
}
