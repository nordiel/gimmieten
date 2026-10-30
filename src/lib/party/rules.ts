import type { CategoryId } from '../../types';

// The rules of party mode (docs/PARTY_MODE.md). The server enforces the same
// numbers; these are the client's copy for display and validation.

export type TopicMode = 'own' | 'shared';

/** 'party': everyone speaks. 'judged': only the host speaks; everyone else judges. */
export type RoomFormat = 'party' | 'judged';

/** Speakers research, explain, and judge the others; judges only rate. */
export type PartyRole = 'player' | 'judge' | 'spectator';

export type PartyPhase = 'lobby' | 'reveal' | 'research' | 'order' | 'upnext' | 'speaking' | 'judging' | 'results';

export type PartyExplainMinutes = 1 | 2;

export interface RoomSettings {
  topicMode: TopicMode;
  category: CategoryId | 'all';
  explainMinutes: PartyExplainMinutes;
  maxPlayers: number;
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  topicMode: 'own',
  category: 'all',
  explainMinutes: 1,
  maxPlayers: MAX_PLAYERS,
};

export const UPNEXT_SECONDS = 5;
export const AUTOSTART_SECONDS = 10;
export const JUDGING_SECONDS = 30;
export const ABSENT_SPEAKER_WAIT_SECONDS = 15;
export const HOST_MIGRATION_SECONDS = 60;
export const ROOM_IDLE_HOURS = 6;

/** Fill in defaults and clamp anything out of range. */
export function normalizeSettings(input: Partial<RoomSettings>): RoomSettings {
  const maxPlayers = Number.isInteger(input.maxPlayers)
    ? Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, input.maxPlayers as number))
    : DEFAULT_ROOM_SETTINGS.maxPlayers;
  return {
    topicMode: input.topicMode === 'shared' ? 'shared' : 'own',
    category: input.category ?? DEFAULT_ROOM_SETTINGS.category,
    explainMinutes: input.explainMinutes === 2 ? 2 : 1,
    maxPlayers,
  };
}
