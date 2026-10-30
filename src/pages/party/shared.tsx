import { AlertTriangle, Crown } from 'lucide-react';
import type { ReactNode } from 'react';
import { startGame, type RoomPlayer, type RoomState } from '../../api/party';
import { TOPICS } from '../../data/topics';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { dealTopics } from '../../lib/party';

/** Everything a phase screen needs, computed once in PartyRoom. */
export interface PartyContext {
  state: RoomState;
  myId: string;
  me: RoomPlayer | undefined;
  isHost: boolean;
  /** Speakers this round: they research, explain, and judge the others. */
  active: RoomPlayer[];
  /** Everyone who rates: speakers and judges, not spectators. */
  raters: RoomPlayer[];
  nameOf: (userId: string) => string;
  act: (action: () => Promise<unknown>) => Promise<void>;
  busy: boolean;
  /** Current phase deadline on this device's clock, if any. */
  endsAtLocal: number | null;
  /** Current phase start on this device's clock. */
  startedAtLocal: number;
  completedTopicIds: string[];
}

/** Milliseconds left in the current phase, ticking. */
export function useRemaining(endsAtLocal: number | null): number {
  const now = useNow(endsAtLocal !== null, endsAtLocal);
  return endsAtLocal === null ? 0 : Math.max(0, endsAtLocal - now);
}

export function seconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

export function errorText(t: ReturnType<typeof useI18n>['t'], code: string): string {
  return t.party.errors[code] ?? t.party.errors.generic!;
}

export function ErrorBanner({ code, onDismiss }: { code: string; onDismiss?: () => void }) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex animate-fade-up items-center gap-3 rounded-2xl border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-bone"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-alert" aria-hidden="true" />
      <span className="flex-1">{errorText(t, code)}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="rounded px-2 text-mute hover:text-bone">
          ×
        </button>
      )}
    </div>
  );
}

export function PlayerName({ player, myId, hostId, children }: {
  player: RoomPlayer;
  myId: string;
  hostId: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {player.userId === hostId && <Crown className="h-4 w-4 shrink-0 text-lime" aria-label={t.party.host} />}
      <span className="truncate font-display font-bold">{player.nickname}</span>
      {player.userId === myId && <span className="shrink-0 text-xs text-mute">({t.party.you})</span>}
      {children}
    </span>
  );
}

/** A compact "Research starts in 12s"-style line. */
export function PhaseCountdown({ endsAtLocal, format }: { endsAtLocal: number | null; format: (s: number) => string }) {
  const remaining = useRemaining(endsAtLocal);
  if (endsAtLocal === null) return null;
  return <p className="tabular font-mono text-sm text-mute">{format(seconds(remaining))}</p>;
}

/**
 * Host only: deal this round's topics (fresh for each player where possible,
 * never repeating this room's earlier rounds) and start it.
 */
export function startRound(ctx: PartyContext, force = false): Promise<void> {
  const { room, players, previousTopicIds } = ctx.state;
  const topics = dealTopics({
    // Judges never get a topic. Spectators may: the server ignores extras.
    playerIds: players.filter((p) => p.role !== 'judge').map((p) => p.userId),
    topics: TOPICS,
    settings: { topicMode: room.topicMode, category: room.category },
    completedByPlayer: Object.fromEntries(
      players.map((p) => [p.userId, [...p.completedTopicIds, ...previousTopicIds]]),
    ),
  });
  return ctx.act(() => startGame(room.id, topics, force));
}
