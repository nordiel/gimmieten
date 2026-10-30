import type { CategoryId } from '../types';
import type { PartyPhase, PartyRating, TopicMode } from '../lib/party';
import type { Json } from './database.types';
import { getSupabase } from './supabase';

// Typed wrappers around the party RPCs (supabase/migrations/*_party_mode.sql).
// Components use these, never the Supabase client directly.

export interface Room {
  id: string;
  code: string;
  hostId: string;
  topicMode: TopicMode;
  category: CategoryId | 'all';
  explainMinutes: 1 | 2;
  maxPlayers: number;
  locked: boolean;
  phase: PartyPhase;
  round: number;
  /** Server clock, epoch ms. */
  phaseStartedAt: number;
  phaseEndsAt: number | null;
  speakingOrder: string[];
  currentTurn: number;
  ratingsCount: number;
  version: number;
}

export interface RoomPlayer {
  userId: string;
  nickname: string;
  joinedAt: number;
  ready: boolean;
  done: boolean;
  skipped: boolean;
  role: 'player' | 'spectator';
  completedTopicIds: string[];
}

export interface RoomState {
  room: Room;
  players: RoomPlayer[];
  /** Topics I'm allowed to see for the current round: userId → topicId. */
  topics: Record<string, string>;
  /** Every topic used in earlier rounds of this room. */
  previousTopicIds: string[];
  /** Whether I've already rated the current speaker. */
  ratedCurrentTurn: boolean;
}

export interface RoomPeek {
  roomId: string | null;
  phase: PartyPhase;
  players: number;
  maxPlayers: number;
  locked: boolean;
}

/** A server rejection with a stable code (see `private.fail` in the migration). */
export class PartyError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

type Result<T> = { data: T | null; error: { message: string } | null };

/** The data of a successful call, which the server always returns. */
function check<T>(result: Result<T>): T {
  return checkMaybe(result) as T;
}

/** The data of a successful call that may legitimately be empty. */
function checkMaybe<T>(result: Result<T>): T | null {
  if (result.error) {
    const known = /^[a-z_]+$/.test(result.error.message);
    throw new PartyError(known ? result.error.message : 'network');
  }
  return result.data;
}

/** Sign in as an anonymous guest unless already signed in. Returns the user id. */
export async function ensureSession(): Promise<string> {
  const db = getSupabase();
  const { data } = await db.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await db.auth.signInAnonymously();
  if (error || !signedIn.user) throw new PartyError('sign_in_failed');
  return signedIn.user.id;
}

const ms = (iso: string | null) => (iso === null ? null : Date.parse(iso));

export async function fetchRoomState(roomId: string, myId: string): Promise<RoomState | null> {
  const db = getSupabase();
  const [roomRes, playersRes, topicsRes] = await Promise.all([
    db.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    db.from('room_players').select('*').eq('room_id', roomId).order('joined_at'),
    db.from('room_topics').select('*').eq('room_id', roomId),
  ]);
  const r = checkMaybe(roomRes);
  if (!r) return null; // Gone, or I'm no longer a member.

  const room: Room = {
    id: r.id,
    code: r.code,
    hostId: r.host_id,
    topicMode: r.topic_mode === 'shared' ? 'shared' : 'own',
    category: r.category as CategoryId | 'all',
    explainMinutes: r.explain_minutes === 2 ? 2 : 1,
    maxPlayers: r.max_players,
    locked: r.locked,
    phase: r.phase as PartyPhase,
    round: r.round,
    phaseStartedAt: Date.parse(r.phase_started_at),
    phaseEndsAt: ms(r.phase_ends_at),
    speakingOrder: r.speaking_order,
    currentTurn: r.current_turn,
    ratingsCount: r.ratings_count,
    version: r.version,
  };
  const players: RoomPlayer[] = check(playersRes).map((p) => ({
    userId: p.user_id,
    nickname: p.nickname,
    joinedAt: Date.parse(p.joined_at),
    ready: p.ready,
    done: p.done,
    skipped: p.skipped,
    role: p.role === 'spectator' ? 'spectator' : 'player',
    completedTopicIds: p.completed_topic_ids,
  }));
  const topicRows = check(topicsRes);
  const topics = Object.fromEntries(
    topicRows.filter((t) => t.round === room.round).map((t) => [t.user_id, t.topic_id]),
  );
  const previousTopicIds = topicRows.filter((t) => t.round < room.round).map((t) => t.topic_id);

  let ratedCurrentTurn = false;
  const speaker = room.speakingOrder[room.currentTurn];
  if (room.phase === 'judging' && speaker) {
    const rated = check(
      await db
        .from('peer_ratings')
        .select('rater_id')
        .eq('room_id', roomId)
        .eq('round', room.round)
        .eq('target_id', speaker)
        .eq('rater_id', myId),
    );
    ratedCurrentTurn = rated.length > 0;
  }
  return { room, players, topics, previousTopicIds, ratedCurrentTurn };
}

/** Calls `onChange` whenever the room row changes, and after (re)connecting. */
export function subscribeToRoom(roomId: string, onChange: () => void): () => void {
  const db = getSupabase();
  const channel = db
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, onChange)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onChange();
    });
  return () => {
    void db.removeChannel(channel);
  };
}

/** Server clock minus local clock, in ms, from a round trip's midpoint. */
export async function measureClockOffset(): Promise<number> {
  const db = getSupabase();
  const sentAt = Date.now();
  const serverIso = check(await db.rpc('server_time'));
  const receivedAt = Date.now();
  return Date.parse(serverIso) - (sentAt + receivedAt) / 2;
}

// ---------- Lobby ----------

export async function createRoom(nickname: string, completedTopicIds: string[]): Promise<string> {
  return check(await getSupabase().rpc('create_room', { p_nickname: nickname, p_completed: completedTopicIds }));
}

export async function peekRoom(code: string): Promise<RoomPeek | null> {
  return checkMaybe(await getSupabase().rpc('peek_room', { p_code: code })) as RoomPeek | null;
}

export async function joinRoom(code: string, nickname: string, completedTopicIds: string[]): Promise<string> {
  return check(
    await getSupabase().rpc('join_room', { p_code: code, p_nickname: nickname, p_completed: completedTopicIds }),
  );
}

export async function setReady(roomId: string, ready: boolean): Promise<void> {
  check(await getSupabase().rpc('set_ready', { p_room: roomId, p_ready: ready }));
}

export async function updateSettings(
  roomId: string,
  settings: { topicMode: TopicMode; category: CategoryId | 'all'; explainMinutes: 1 | 2; maxPlayers: number },
): Promise<void> {
  check(
    await getSupabase().rpc('update_settings', {
      p_room: roomId,
      p_topic_mode: settings.topicMode,
      p_category: settings.category,
      p_explain_minutes: settings.explainMinutes,
      p_max_players: settings.maxPlayers,
    }),
  );
}

export async function setLocked(roomId: string, locked: boolean): Promise<void> {
  check(await getSupabase().rpc('set_locked', { p_room: roomId, p_locked: locked }));
}

export async function kickPlayer(roomId: string, userId: string): Promise<void> {
  check(await getSupabase().rpc('kick_player', { p_room: roomId, p_user: userId }));
}

export async function leaveRoom(roomId: string): Promise<void> {
  check(await getSupabase().rpc('leave_room', { p_room: roomId }));
}

// ---------- Game ----------

export async function startGame(roomId: string, topics: Record<string, string>, force = false): Promise<void> {
  check(await getSupabase().rpc('start_game', { p_room: roomId, p_topics: topics as Json, p_force: force }));
}

export async function skipTopic(roomId: string, topicId: string): Promise<void> {
  check(await getSupabase().rpc('skip_topic', { p_room: roomId, p_topic_id: topicId }));
}

export async function markDone(roomId: string): Promise<void> {
  check(await getSupabase().rpc('mark_done', { p_room: roomId }));
}

export async function startTurn(roomId: string): Promise<void> {
  check(await getSupabase().rpc('start_turn', { p_room: roomId }));
}

export async function finishTurn(roomId: string): Promise<void> {
  check(await getSupabase().rpc('finish_turn', { p_room: roomId }));
}

export async function submitRating(roomId: string, ratings: { clarity: number; confidence: number; learned: number }) {
  check(
    await getSupabase().rpc('submit_rating', {
      p_room: roomId,
      p_clarity: ratings.clarity,
      p_confidence: ratings.confidence,
      p_learned: ratings.learned,
    }),
  );
}

export async function advanceRoom(roomId: string, version: number): Promise<boolean> {
  return check(await getSupabase().rpc('advance_room', { p_room: roomId, p_version: version }));
}

/**
 * The round's ratings as `PartyRating`s for the scoring rules. The server
 * returns each criterion as its own sorted, anonymous array, so index i is not
 * one judge's full rating. That's fine: scoring averages each criterion
 * independently. Judges get placeholder ids.
 */
export async function fetchRoundRatings(roomId: string, round: number): Promise<PartyRating[]> {
  const rows = check(await getSupabase().rpc('round_scores', { p_room: roomId, p_round: round }));
  return rows.flatMap((row) => {
    const judged = row.clarity.map((clarity, i) => ({
      raterId: `judge-${i}`,
      targetId: row.target_id,
      ratings: { clarity, confidence: row.confidence[i] ?? 0, learned: row.learned[i] ?? 0 },
    }));
    const self =
      row.self_clarity != null && row.self_confidence != null && row.self_learned != null
        ? [{
            raterId: row.target_id,
            targetId: row.target_id,
            ratings: { clarity: row.self_clarity, confidence: row.self_confidence, learned: row.self_learned },
          }]
        : [];
    return [...judged, ...self];
  });
}
