// Party mode against a real local Supabase: `npm run db:start`, then `npm run test:db`.
// Plays a full round with four guest players and checks the server rejects cheating.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { before, describe, it } from 'node:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/api/database.types';
import { TOPICS } from '../../src/data/topics';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);
const URL = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;

type Client = SupabaseClient<Database>;
interface Player {
  db: Client;
  id: string;
  name: string;
}

async function guest(name: string): Promise<Player> {
  const db = createClient<Database>(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error('no user');
  return { db, id: data.user.id, name };
}

/** Call an RPC and return its error code (the server's `fail()` message), or null. */
async function failure(promise: PromiseLike<{ error: { message: string } | null }>): Promise<string | null> {
  const { error } = await promise;
  return error?.message ?? null;
}

async function ok<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(`unexpected error: ${error.message}`);
  return data as T;
}

async function room(p: Player, roomId: string) {
  const { data, error } = await p.db.from('rooms').select('*').eq('id', roomId).single();
  if (error || !data) throw new Error(`room not readable: ${error?.message}`);
  return data;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const science = TOPICS.filter((t) => t.category === 'science').map((t) => t.id);

describe('party mode on the server', () => {
  let host: Player, ana: Player, ben: Player, cy: Player, late: Player;
  let all: Player[];
  let code: string;
  let roomId: string;

  before(async () => {
    [host, ana, ben, cy, late] = (await Promise.all(['Host', 'Ana', 'Ben', 'Cy', 'Late'].map(guest))) as [Player, Player, Player, Player, Player];
    all = [host, ana, ben, cy];
  });

  it('creates a room with a readable code', async () => {
    code = await ok(host.db.rpc('create_room', { p_nickname: 'Host', p_completed: [science[0]!] }));
    assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    const peek = (await ok(ana.db.rpc('peek_room', { p_code: code.toLowerCase() }))) as Record<string, unknown>;
    assert.equal(peek.roomId, null);
    assert.equal(peek.players, 1);
    assert.equal(peek.phase, 'lobby');
  });

  it('lets players join and rejects bad or duplicate nicknames', async () => {
    roomId = await ok(ana.db.rpc('join_room', { p_code: code, p_nickname: 'Ana' }));
    await ok(ben.db.rpc('join_room', { p_code: ` ${code.toLowerCase()} `, p_nickname: 'Ben' }));
    assert.equal(await failure(cy.db.rpc('join_room', { p_code: code, p_nickname: 'ana' })), 'nickname_taken');
    assert.equal(await failure(cy.db.rpc('join_room', { p_code: code, p_nickname: '<b>x</b>' })), 'nickname_invalid');
    assert.equal(await failure(cy.db.rpc('join_room', { p_code: code, p_nickname: 'C' })), 'nickname_too_short');
    await ok(cy.db.rpc('join_room', { p_code: code, p_nickname: 'Cy' }));
    // Rejoining returns the same room without changes.
    assert.equal(await ok(ana.db.rpc('join_room', { p_code: code, p_nickname: 'whatever' })), roomId);
    assert.equal(await failure(late.db.rpc('join_room', { p_code: 'ZZZZZZ', p_nickname: 'Late' })), 'room_not_found');
  });

  it('keeps room data private and blocks direct writes', async () => {
    assert.deepEqual(await ok(late.db.from('rooms').select('id').eq('id', roomId)), []);
    assert.deepEqual(await ok(late.db.from('room_players').select('user_id').eq('room_id', roomId)), []);
    const insert = await host.db.from('rooms').update({ phase: 'results' }).eq('id', roomId);
    assert.ok(insert.error, 'direct update should be denied');
    assert.equal((await room(host, roomId)).phase, 'lobby');
  });

  it('enforces host-only settings and room size', async () => {
    const settings = { p_room: roomId, p_topic_mode: 'own', p_category: 'science', p_explain_minutes: 1, p_max_players: 4 };
    assert.equal(await failure(ana.db.rpc('update_settings', settings)), 'not_host');
    await ok(host.db.rpc('update_settings', settings));
    const r = await room(host, roomId);
    assert.equal(r.max_players, 4);
    assert.equal(r.category, 'science');
    assert.equal(await failure(late.db.rpc('join_room', { p_code: code, p_nickname: 'Late' })), 'room_full');
  });

  it("won't start until everyone is ready, and validates the deal", async () => {
    const own = Object.fromEntries(all.map((p, i) => [p.id, science[i + 1]!]));
    assert.equal(await failure(host.db.rpc('start_game', { p_room: roomId, p_topics: own })), 'not_ready');
    await Promise.all([ana, ben, cy].map((p) => ok(p.db.rpc('set_ready', { p_room: roomId, p_ready: true }))));
    assert.equal(await failure(ana.db.rpc('start_game', { p_room: roomId, p_topics: own })), 'not_host');
    const duplicate = Object.fromEntries(all.map((p) => [p.id, science[1]!]));
    assert.equal(await failure(host.db.rpc('start_game', { p_room: roomId, p_topics: duplicate })), 'invalid_topics');
    const offCategory = { ...own, [cy.id]: 'history-the-silk-road' };
    assert.equal(await failure(host.db.rpc('start_game', { p_room: roomId, p_topics: offCategory })), 'invalid_topics');
    await ok(host.db.rpc('start_game', { p_room: roomId, p_topics: own }));
    const r = await room(host, roomId);
    assert.equal(r.phase, 'reveal');
    assert.equal(r.round, 1);
  });

  it("hides other players' topics during reveal and allows one skip", async () => {
    for (const p of all) {
      const visible = await ok(p.db.from('room_topics').select('user_id').eq('room_id', roomId));
      assert.deepEqual(visible.map((t) => t.user_id), [p.id]);
    }
    assert.equal(await failure(ana.db.rpc('skip_topic', { p_room: roomId, p_topic_id: science[3]! })), 'topic_taken');
    await ok(ana.db.rpc('skip_topic', { p_room: roomId, p_topic_id: science[9]! }));
    assert.equal(await failure(ana.db.rpc('skip_topic', { p_room: roomId, p_topic_id: science[10]! })), 'already_skipped');
  });

  it('moves through reveal and research once everyone is done, then draws an order', async () => {
    for (const p of all) await ok(p.db.rpc('mark_done', { p_room: roomId }));
    assert.equal((await room(host, roomId)).phase, 'research');
    for (const p of all) await ok(p.db.rpc('mark_done', { p_room: roomId }));
    const r = await room(host, roomId);
    assert.equal(r.phase, 'order');
    assert.deepEqual([...r.speaking_order].sort(), all.map((p) => p.id).sort());
  });

  it('advances exactly once when many phones hit the deadline together', async () => {
    const r = await room(host, roomId);
    assert.equal(await ok(host.db.rpc('advance_room', { p_room: roomId, p_version: r.version })), false); // too early
    await wait(4300);
    const results = await Promise.all(all.map((p) => ok(p.db.rpc('advance_room', { p_room: roomId, p_version: r.version }))));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await room(host, roomId)).phase, 'upnext');
  });

  it('runs every turn: only the speaker controls it, judges rate once, round ends in results', async () => {
    const order = (await room(host, roomId)).speaking_order;
    const byId = new Map(all.map((p) => [p.id, p]));
    for (let turn = 0; turn < order.length; turn++) {
      const speaker = byId.get(order[turn]!)!;
      const listeners = all.filter((p) => p !== speaker);
      assert.equal((await room(host, roomId)).phase, 'upnext');
      assert.equal(await failure(listeners[0]!.db.rpc('start_turn', { p_room: roomId })), 'not_your_turn');
      await ok(speaker.db.rpc('start_turn', { p_room: roomId }));
      // The speaker's topic is now visible to everyone.
      const seen = await ok(listeners[0]!.db.from('room_topics').select('user_id').eq('room_id', roomId).eq('user_id', speaker.id));
      assert.equal(seen.length, 1);
      assert.equal(await failure(listeners[0]!.db.rpc('finish_turn', { p_room: roomId })), 'not_your_turn');
      await ok(speaker.db.rpc('finish_turn', { p_room: roomId }));
      assert.equal((await room(host, roomId)).phase, 'judging');

      const judge = listeners[0]!;
      assert.equal(await failure(judge.db.rpc('round_scores', { p_room: roomId, p_round: 1 })), 'round_not_finished');
      assert.equal(await failure(judge.db.rpc('submit_rating', { p_room: roomId, p_clarity: 6, p_confidence: 3, p_learned: 3 })), 'invalid_rating');
      await ok(judge.db.rpc('submit_rating', { p_room: roomId, p_clarity: 5, p_confidence: 4, p_learned: 5 }));
      assert.equal(await failure(judge.db.rpc('submit_rating', { p_room: roomId, p_clarity: 1, p_confidence: 1, p_learned: 1 })), 'already_rated');
      for (const p of [...listeners.slice(1), speaker]) {
        await ok(p.db.rpc('submit_rating', { p_room: roomId, p_clarity: 3, p_confidence: 3, p_learned: 4 }));
      }
      // Nobody can read someone else's individual ratings.
      const visible = await ok(speaker.db.from('peer_ratings').select('rater_id').eq('room_id', roomId));
      assert.ok(visible.every((row) => row.rater_id === speaker.id));
    }
    assert.equal((await room(host, roomId)).phase, 'results');
  });

  it('reports anonymous, sorted ratings per speaker for scoring', async () => {
    const rows = await ok(ana.db.rpc('round_scores', { p_room: roomId, p_round: 1 }));
    assert.equal(rows.length, 4);
    for (const row of rows) {
      assert.equal(row.clarity.length, 3);
      assert.deepEqual([...row.clarity], [...row.clarity].sort());
      assert.equal(row.self_clarity, 3);
      assert.ok(!('rater_id' in row));
    }
  });

  it('plays again in the same room, revealing last round to everyone', async () => {
    const next = Object.fromEntries(all.map((p, i) => [p.id, science[i + 5]!]));
    await ok(host.db.rpc('start_game', { p_room: roomId, p_topics: next }));
    const r = await room(host, roomId);
    assert.equal(r.round, 2);
    assert.equal(r.phase, 'reveal');
    const round1 = await ok(cy.db.from('room_topics').select('user_id').eq('room_id', roomId).eq('round', 1));
    assert.equal(round1.length, 4);
  });
});

describe('get judged: one speaker, the rest judges', () => {
  let host: Player, dee: Player, eli: Player;
  let roomId: string;

  before(async () => {
    [host, dee, eli] = (await Promise.all(['Host', 'Dee', 'Eli'].map(guest))) as [Player, Player, Player];
    const code = await ok(host.db.rpc('create_room', { p_nickname: 'Host', p_format: 'judged' }));
    roomId = await ok(dee.db.rpc('join_room', { p_code: code, p_nickname: 'Dee' }));
    await ok(eli.db.rpc('join_room', { p_code: code, p_nickname: 'Eli' }));
  });

  const roles = async () =>
    Object.fromEntries(
      (await ok(host.db.from('room_players').select('user_id, role').eq('room_id', roomId))).map((p) => [p.user_id, p.role]),
    );

  it('makes joiners judges, and switching format resets roles', async () => {
    assert.deepEqual(await roles(), { [host.id]: 'player', [dee.id]: 'judge', [eli.id]: 'judge' });
    const settings = { p_room: roomId, p_topic_mode: 'own', p_category: 'all', p_explain_minutes: 1, p_max_players: 6 };
    await ok(host.db.rpc('update_settings', { ...settings, p_format: 'party' }));
    assert.deepEqual(await roles(), { [host.id]: 'player', [dee.id]: 'player', [eli.id]: 'player' });
    await ok(host.db.rpc('update_settings', { ...settings, p_format: 'judged' }));
    assert.deepEqual(await roles(), { [host.id]: 'player', [dee.id]: 'judge', [eli.id]: 'judge' });
  });

  it('needs someone to speak', async () => {
    await Promise.all([dee, eli].map((p) => ok(p.db.rpc('set_ready', { p_room: roomId, p_ready: true }))));
    assert.equal(await failure(dee.db.rpc('set_role', { p_room: roomId, p_role: 'host' })), 'invalid_role');
    await ok(host.db.rpc('set_role', { p_room: roomId, p_role: 'judge' }));
    assert.equal(await failure(host.db.rpc('start_game', { p_room: roomId, p_topics: {} })), 'not_enough_players');
    await ok(host.db.rpc('set_role', { p_room: roomId, p_role: 'player' }));
  });

  it('deals a topic only to the speaker and hides it from judges until the turn', async () => {
    await ok(host.db.rpc('start_game', { p_room: roomId, p_topics: { [host.id]: science[0]! } }));
    const dealt = await ok(host.db.from('room_topics').select('user_id').eq('room_id', roomId));
    assert.deepEqual(dealt.map((t) => t.user_id), [host.id]);
    const peek = await ok(dee.db.from('room_topics').select('user_id').eq('room_id', roomId));
    assert.equal(peek.length, 0);
    assert.equal(await failure(dee.db.rpc('skip_topic', { p_room: roomId, p_topic_id: science[1]! })), 'not_a_player');
  });

  it('skips the order draw for a lone speaker, then waits for every judge', async () => {
    await ok(host.db.rpc('mark_done', { p_room: roomId }));
    assert.equal((await room(host, roomId)).phase, 'research');
    await ok(host.db.rpc('mark_done', { p_room: roomId }));
    const r = await room(host, roomId);
    assert.equal(r.phase, 'upnext');
    assert.deepEqual(r.speaking_order, [host.id]);

    await ok(host.db.rpc('start_turn', { p_room: roomId }));
    await ok(host.db.rpc('finish_turn', { p_room: roomId }));
    await ok(dee.db.rpc('submit_rating', { p_room: roomId, p_clarity: 4, p_confidence: 4, p_learned: 5 }));
    await ok(host.db.rpc('submit_rating', { p_room: roomId, p_clarity: 3, p_confidence: 2, p_learned: 3 }));
    assert.equal((await room(host, roomId)).phase, 'judging');
    await ok(eli.db.rpc('submit_rating', { p_room: roomId, p_clarity: 5, p_confidence: 4, p_learned: 4 }));
    assert.equal((await room(host, roomId)).phase, 'results');

    const [row] = await ok(dee.db.rpc('round_scores', { p_room: roomId, p_round: 1 }));
    assert.deepEqual([...row!.clarity], [4, 5]);
    assert.equal(row!.self_confidence, 2);
  });
});
