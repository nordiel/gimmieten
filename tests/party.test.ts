import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { TOPICS } from '../src/data/topics';
import {
  DEFAULT_ROOM_SETTINGS,
  ROOM_CODE_ALPHABET,
  canStart,
  criterionAverage,
  currentSpeaker,
  dealTopics,
  generateRoomCode,
  handleAbsentSpeaker,
  isLastTurn,
  normalizeRoomCode,
  normalizeSettings,
  redealTopic,
  roundAwards,
  scoreRound,
  scoreSpeaker,
  shuffleOrder,
  validateNickname,
  type PartyRating,
  type PartyRatings,
} from '../src/lib/party';

/** Deterministic PRNG so shuffles and deals are reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const r = (clarity: number, confidence: number, learned: number): PartyRatings => ({ clarity, confidence, learned });
const rate = (raterId: string, targetId: string, ratings: PartyRatings): PartyRating => ({ raterId, targetId, ratings });

describe('room settings', () => {
  it('fills defaults and clamps out-of-range values', () => {
    assert.deepEqual(normalizeSettings({}), DEFAULT_ROOM_SETTINGS);
    const s = normalizeSettings({ topicMode: 'shared', explainMinutes: 2, maxPlayers: 99, category: 'science' });
    assert.deepEqual(s, { topicMode: 'shared', explainMinutes: 2, maxPlayers: 6, category: 'science' });
    assert.equal(normalizeSettings({ maxPlayers: 1 }).maxPlayers, 2);
    assert.equal(normalizeSettings({ explainMinutes: 5 as never }).explainMinutes, 1);
  });
});

describe('lobby', () => {
  it('generates readable 6-character codes and normalizes typed ones', () => {
    const rand = seeded(1);
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode(rand);
      assert.equal(code.length, 6);
      assert.ok([...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch)), code);
    }
    assert.equal(normalizeRoomCode(' abc-23z '), 'ABC23Z');
    assert.equal(normalizeRoomCode('ab c2-3z'), 'ABC23Z');
    assert.equal(normalizeRoomCode('abc 23'), null); // too short
    assert.equal(normalizeRoomCode('ABCO12'), null); // O and 1 aren't in the alphabet
  });

  it('validates nicknames in any language and rejects duplicates', () => {
    assert.deepEqual(validateNickname('  José   María '), { ok: true, nickname: 'José María' });
    assert.deepEqual(validateNickname('Zoë_99'), { ok: true, nickname: 'Zoë_99' });
    assert.deepEqual(validateNickname('A'), { ok: false, error: 'tooShort' });
    assert.deepEqual(validateNickname('x'.repeat(21)), { ok: false, error: 'tooLong' });
    assert.deepEqual(validateNickname('<script>'), { ok: false, error: 'invalidCharacters' });
    assert.deepEqual(validateNickname('-dash'), { ok: false, error: 'invalidCharacters' });
    assert.deepEqual(validateNickname('jose', ['José']), { ok: false, error: 'taken' });
  });

  it('starts with 2+ players when everyone is ready, or early with 2+ ready when forced', () => {
    assert.equal(canStart([{ id: 'a', ready: true }]), false);
    assert.equal(canStart([{ id: 'a', ready: true }, { id: 'b', ready: false }]), false);
    // Forcing drops b to spectator, leaving one player: the server refuses that too.
    assert.equal(canStart([{ id: 'a', ready: true }, { id: 'b', ready: false }], true), false);
    assert.equal(canStart([{ id: 'a', ready: true }, { id: 'b', ready: true }, { id: 'c', ready: false }], true), true);
    assert.equal(canStart([{ id: 'a', ready: true }, { id: 'b', ready: true }]), true);
  });

  it('needs at least one speaker; judges count toward the two', () => {
    const speaker = { id: 'a', ready: true };
    const judge = { id: 'b', ready: true, speaks: false };
    assert.equal(canStart([speaker, judge]), true);
    assert.equal(canStart([{ ...speaker, speaks: false }, judge]), false);
    assert.equal(canStart([speaker, { ...judge, ready: false }], true), false);
  });
});

describe('topic dealing', () => {
  const players = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('gives every player a different topic in own mode, from the chosen category', () => {
    for (let seed = 0; seed < 25; seed++) {
      const dealt = dealTopics({ playerIds: players, topics: TOPICS, settings: { topicMode: 'own', category: 'science' }, rand: seeded(seed) });
      const ids = Object.values(dealt);
      assert.equal(ids.length, 6);
      assert.equal(new Set(ids).size, 6);
      assert.ok(ids.every((id) => id.startsWith('science-')));
    }
  });

  it("avoids each player's completed topics while fresh ones remain", () => {
    const science = TOPICS.filter((t) => t.category === 'science').map((t) => t.id);
    const completedByPlayer = { a: science.slice(0, 11) }; // only the last one is fresh for "a"
    for (let seed = 0; seed < 25; seed++) {
      const dealt = dealTopics({ playerIds: ['a', 'b'], topics: TOPICS, settings: { topicMode: 'own', category: 'science' }, completedByPlayer, rand: seeded(seed) });
      assert.equal(dealt.a, science[11]);
      assert.notEqual(dealt.b, dealt.a);
    }
  });

  it('gives everyone the same topic in shared mode, preferring one nobody has done', () => {
    const science = TOPICS.filter((t) => t.category === 'science').map((t) => t.id);
    const completedByPlayer = { a: science.slice(0, 6), b: science.slice(6, 11) };
    const dealt = dealTopics({ playerIds: ['a', 'b', 'c'], topics: TOPICS, settings: { topicMode: 'shared', category: 'science' }, completedByPlayer, rand: seeded(3) });
    assert.equal(new Set(Object.values(dealt)).size, 1);
    assert.equal(dealt.a, science[11]);
  });

  it('redeals one topic on a skip without colliding with anyone', () => {
    const settings = { topicMode: 'own' as const, category: 'science' as const };
    const dealt = dealTopics({ playerIds: players, topics: TOPICS, settings, rand: seeded(9) });
    const after = redealTopic(dealt, 'c', { topics: TOPICS, settings, rand: seeded(10) });
    assert.notEqual(after.c, dealt.c);
    assert.equal(new Set(Object.values(after)).size, 6);
    for (const id of players.filter((p) => p !== 'c')) assert.equal(after[id], dealt[id]);
  });
});

describe('speaking order', () => {
  it('shuffles into a permutation and lets anyone go first', () => {
    const firsts = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const order = shuffleOrder(['a', 'b', 'c', 'd'], seeded(seed));
      assert.deepEqual([...order].sort(), ['a', 'b', 'c', 'd']);
      firsts.add(order[0]!);
    }
    assert.equal(firsts.size, 4);
  });

  it('defers an absent speaker to the end once, then skips them', () => {
    let state = { order: ['a', 'b', 'c'], turn: 0, deferredIds: [] as string[] };
    const first = handleAbsentSpeaker(state);
    assert.equal(first.outcome, 'deferred');
    assert.deepEqual(first.order, ['b', 'c', 'a']);
    assert.equal(currentSpeaker(first), 'b');

    state = { ...first, turn: 2 }; // b and c have spoken; "a" is up again
    assert.equal(isLastTurn(state), true);
    const second = handleAbsentSpeaker(state);
    assert.equal(second.outcome, 'skipped');
    assert.equal(second.turn, 3);
    assert.equal(currentSpeaker(second), undefined);
  });
});

describe('party scoring', () => {
  it('averages, trimming the highest and lowest with 4+ judges', () => {
    assert.equal(criterionAverage([]), null);
    assert.equal(criterionAverage([2, 4]), 3);
    assert.equal(criterionAverage([5, 4, 4, 1]), 4); // drops 5 and 1
    assert.equal(criterionAverage([5, 5, 5, 5, 1]), 5);
  });

  it('scores a speaker from judges, keeps self apart, and reports the gap', () => {
    const ratings = [
      rate('b', 'a', r(4, 4, 4)),
      rate('c', 'a', r(5, 4, 3)),
      rate('a', 'a', r(3, 2, 3)), // self
    ];
    const s = scoreSpeaker('a', ratings);
    assert.equal(s.judges, 2);
    assert.deepEqual(s.criteria, { clarity: 4.5, confidence: 4, learned: 3.5 });
    assert.equal(s.roomScore, 80);
    assert.equal(s.selfScore, 53);
    assert.equal(s.gap, -27);
  });

  it('ignores invalid ratings and counts each judge once', () => {
    const s = scoreSpeaker('a', [
      rate('b', 'a', r(1, 1, 1)),
      rate('b', 'a', r(5, 5, 5)), // b changed their mind: last one counts
      rate('c', 'a', r(9, 0, 3)), // out of range
    ]);
    assert.equal(s.judges, 1);
    assert.equal(s.roomScore, 100);
    assert.equal(s.selfScore, null);
    assert.equal(s.gap, null);
  });
});

describe('awards', () => {
  const ratings: PartyRating[] = [
    // a: strong all round, rated themselves low
    rate('b', 'a', r(5, 4, 5)), rate('c', 'a', r(5, 4, 5)), rate('a', 'a', r(2, 2, 2)),
    // b: most confident
    rate('a', 'b', r(3, 5, 3)), rate('c', 'b', r(3, 5, 3)), rate('b', 'b', r(3, 5, 3)),
    // c: ties a on "learned"
    rate('a', 'c', r(4, 3, 5)), rate('b', 'c', r(4, 3, 5)), rate('c', 'c', r(4, 3, 5)),
  ];

  it('picks winners with shared ties', () => {
    const awards = roundAwards(scoreRound(['a', 'b', 'c'], ratings));
    const by = Object.fromEntries(awards.map((a) => [a.kind, a.playerIds]));
    assert.deepEqual(by.bestTeacher, ['a']);
    assert.deepEqual(by.mostConfident, ['b']);
    assert.deepEqual(by.taughtMost, ['a', 'c']);
    assert.deepEqual(by.humbleGenius, ['a']);
  });

  it('skips Humble Genius when nobody underrated themselves by 10+ points', () => {
    const fair = ratings.filter((x) => !(x.raterId === 'a' && x.targetId === 'a')).concat(rate('a', 'a', r(5, 4, 5)));
    const kinds = roundAwards(scoreRound(['a', 'b', 'c'], fair)).map((a) => a.kind);
    assert.ok(!kinds.includes('humbleGenius'));
  });

  it('gives no awards in a 2-player room (one judge each)', () => {
    const two = [rate('a', 'b', r(5, 5, 5)), rate('b', 'a', r(3, 3, 3))];
    assert.deepEqual(roundAwards(scoreRound(['a', 'b'], two)), []);
  });
});
