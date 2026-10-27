export type PartyCriterion = 'clarity' | 'confidence' | 'learned';

export const PARTY_CRITERIA: PartyCriterion[] = ['clarity', 'confidence', 'learned'];

export type PartyRatings = Record<PartyCriterion, number>;

export interface PartyRating {
  raterId: string;
  targetId: string;
  /** When raterId === targetId this is the speaker's self-rating. */
  ratings: PartyRatings;
}

/** Trim the single highest and lowest rating once there are at least this many judges. */
export const TRIM_FROM_JUDGES = 4;

export interface SpeakerScore {
  playerId: string;
  judges: number;
  /** Average per criterion from the judges (1–5), or null with no judges. */
  criteria: Record<PartyCriterion, number | null>;
  /** 20–100, same scale as solo play. */
  roomScore: number | null;
  selfScore: number | null;
  /** selfScore − roomScore: negative means the speaker underrated themselves. */
  gap: number | null;
}

function isValidRatings(r: PartyRatings): boolean {
  return PARTY_CRITERIA.every((c) => Number.isInteger(r[c]) && r[c] >= 1 && r[c] <= 5);
}

/** Mean of 1–5 values; with enough judges, drop one highest and one lowest first. */
export function criterionAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const used = values.length >= TRIM_FROM_JUDGES ? sorted.slice(1, -1) : sorted;
  return used.reduce((sum, v) => sum + v, 0) / used.length;
}

function toPercent(criteria: (number | null)[]): number | null {
  if (criteria.some((v) => v === null)) return null;
  const mean = (criteria as number[]).reduce((sum, v) => sum + v, 0) / criteria.length;
  return Math.round((mean / 5) * 100);
}

export function scoreSpeaker(playerId: string, ratings: readonly PartyRating[]): SpeakerScore {
  const mine = ratings.filter((r) => r.targetId === playerId && isValidRatings(r.ratings));
  // One vote per judge: if a rater appears twice, their last rating counts.
  const byJudge = new Map(mine.filter((r) => r.raterId !== playerId).map((r) => [r.raterId, r.ratings]));
  const self = [...mine].reverse().find((r) => r.raterId === playerId)?.ratings;

  const judgeRatings = [...byJudge.values()];
  const criteria = Object.fromEntries(
    PARTY_CRITERIA.map((c) => [c, criterionAverage(judgeRatings.map((r) => r[c]))]),
  ) as Record<PartyCriterion, number | null>;
  const roomScore = toPercent(PARTY_CRITERIA.map((c) => criteria[c]));
  const selfScore = self ? toPercent(PARTY_CRITERIA.map((c) => self[c])) : null;

  return {
    playerId,
    judges: judgeRatings.length,
    criteria,
    roomScore,
    selfScore,
    gap: roomScore !== null && selfScore !== null ? selfScore - roomScore : null,
  };
}

export function scoreRound(playerIds: readonly string[], ratings: readonly PartyRating[]): SpeakerScore[] {
  return playerIds.map((id) => scoreSpeaker(id, ratings));
}

// ---------- Awards ----------

export type AwardKind = 'bestTeacher' | 'mostConfident' | 'taughtMost' | 'humbleGenius';

export interface Award {
  kind: AwardKind;
  /** Everyone tied for it. */
  playerIds: string[];
}

/** Minimum gap (room score above self score) for Humble Genius. */
export const HUMBLE_GENIUS_MIN_GAP = 10;

/** Awards need at least this many judges per speaker to mean anything. */
export const AWARDS_MIN_JUDGES = 2;

function winners(scores: SpeakerScore[], value: (s: SpeakerScore) => number | null): string[] {
  const valued = scores
    .map((s) => ({ id: s.playerId, v: value(s) }))
    .filter((x): x is { id: string; v: number } => x.v !== null);
  if (valued.length === 0) return [];
  // Compare at two decimals so float noise can't break a tie.
  const best = Math.max(...valued.map((x) => Math.round(x.v * 100)));
  return valued.filter((x) => Math.round(x.v * 100) === best).map((x) => x.id);
}

export function roundAwards(scores: readonly SpeakerScore[]): Award[] {
  const eligible = scores.filter((s) => s.judges >= AWARDS_MIN_JUDGES);
  if (eligible.length === 0) return [];

  const awards: Award[] = [
    { kind: 'bestTeacher', playerIds: winners(eligible, (s) => s.roomScore) },
    { kind: 'mostConfident', playerIds: winners(eligible, (s) => s.criteria.confidence) },
    { kind: 'taughtMost', playerIds: winners(eligible, (s) => s.criteria.learned) },
    {
      kind: 'humbleGenius',
      playerIds: winners(eligible, (s) => (s.gap !== null && -s.gap >= HUMBLE_GENIUS_MIN_GAP ? -s.gap : null)),
    },
  ];
  return awards.filter((a) => a.playerIds.length > 0);
}
