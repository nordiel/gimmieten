import { MIN_PLAYERS } from './rules';

/** No I, L, O, 0, or 1, so codes survive being read aloud or scribbled down. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(rand() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/** Uppercase and strip spaces or dashes; null if it can't be a room code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch)) ? code : null;
}

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

export type NicknameResult =
  | { ok: true; nickname: string }
  | { ok: false; error: 'tooShort' | 'tooLong' | 'invalidCharacters' | 'taken' };

/**
 * Shape checks for a nickname: length, letters/numbers/spaces/._- in any
 * language, and unique in the room ignoring case and accents. The server
 * repeats these checks and adds a word filter.
 */
export function validateNickname(raw: string, takenNicknames: string[] = []): NicknameResult {
  const nickname = raw.trim().replace(/\s+/g, ' ');
  if ([...nickname].length < NICKNAME_MIN) return { ok: false, error: 'tooShort' };
  if ([...nickname].length > NICKNAME_MAX) return { ok: false, error: 'tooLong' };
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._-]*$/u.test(nickname)) return { ok: false, error: 'invalidCharacters' };
  const key = nicknameKey(nickname);
  if (takenNicknames.some((taken) => nicknameKey(taken) === key)) return { ok: false, error: 'taken' };
  return { ok: true, nickname };
}

function nicknameKey(nickname: string): string {
  return nickname
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export interface LobbyPlayer {
  id: string;
  ready: boolean;
  /** False for someone who only judges. Defaults to true. */
  speaks?: boolean;
}

/**
 * Whether the host can start: someone to speak, someone else to judge them,
 * and everyone ready (unless forcing an early start, which only counts the
 * ready players).
 */
export function canStart(players: LobbyPlayer[], force = false): boolean {
  if (!force && !players.every((p) => p.ready)) return false;
  const taking = force ? players.filter((p) => p.ready) : players;
  return taking.length >= MIN_PLAYERS && taking.some((p) => p.speaks !== false);
}
