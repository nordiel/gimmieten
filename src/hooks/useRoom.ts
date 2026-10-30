import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PartyError,
  advanceRoom,
  fetchRoomState,
  measureClockOffset,
  subscribeToRoom,
  type RoomState,
} from '../api/party';

export type RoomStatus = 'loading' | 'ready' | 'gone';

/**
 * Live state for a party room. Realtime pings trigger a refetch (the room's
 * version moves on every change), with a slow poll as a safety net. Every
 * member also nudges the server when a phase deadline passes; the server
 * advances exactly once.
 */
export function useRoom(roomId: string, myId: string) {
  const [state, setState] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<RoomStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const latestVersion = useRef(-1);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchRoomState(roomId, myId);
      if (!next) {
        setStatus('gone');
        return;
      }
      // Responses can arrive out of order; never step back to an older version.
      if (next.room.version < latestVersion.current) return;
      latestVersion.current = next.room.version;
      setState(next);
      setStatus('ready');
    } catch {
      // Keep showing the last good state; the next ping or poll retries.
    }
  }, [roomId, myId]);

  useEffect(() => {
    void measureClockOffset()
      .then(setClockOffset)
      .catch(() => undefined);
    const unsubscribe = subscribeToRoom(roomId, () => void refresh());
    const poll = window.setInterval(() => void refresh(), 10_000);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [roomId, refresh]);

  /** A server time (epoch ms) on this device's clock. */
  const toLocal = useCallback((serverMs: number) => serverMs - clockOffset, [clockOffset]);

  const room = state?.room;
  const endsAtLocal = room?.phaseEndsAt != null ? toLocal(room.phaseEndsAt) : null;

  useEffect(() => {
    if (!room || endsAtLocal === null) return;
    // A little after the deadline, with jitter so phones don't all call at once.
    const delay = Math.max(0, endsAtLocal - Date.now()) + 250 + Math.random() * 400;
    const id = window.setTimeout(() => {
      void advanceRoom(room.id, room.version)
        .catch(() => false)
        .then(() => refresh());
    }, delay);
    return () => window.clearTimeout(id);
  }, [room?.id, room?.version, endsAtLocal, refresh]);

  /** Run an action, surface its error code, and refresh either way. */
  const act = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
      } catch (e) {
        setError(e instanceof PartyError ? e.code : 'network');
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  return { state, status, error, busy, act, refresh, toLocal, endsAtLocal, clearError: () => setError(null) };
}
