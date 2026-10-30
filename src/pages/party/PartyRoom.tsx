import { ArrowLeft, LogOut } from 'lucide-react';
import { leaveRoom } from '../../api/party';
import { Button } from '../../components/ui/Button';
import { useRoom } from '../../hooks/useRoom';
import { useI18n } from '../../i18n';
import { navigate } from '../../lib/route';
import { Lobby } from './Lobby';
import { Judging, OrderReveal, Research, Reveal, Turn } from './Play';
import { Results } from './Results';
import { ErrorBanner, type PartyContext } from './shared';

interface PartyRoomProps {
  roomId: string;
  myId: string;
  completedTopicIds: string[];
}

export function PartyRoom({ roomId, myId, completedTopicIds }: PartyRoomProps) {
  const { t } = useI18n();
  const { state, status, error, busy, act, toLocal, endsAtLocal, clearError } = useRoom(roomId, myId);

  if (status === 'gone') {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <ErrorBanner code="room_not_found" />
        <p className="text-mute">{t.party.roomGone}</p>
        <Button variant="ghost" onClick={() => navigate('/party')} icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
          {t.party.back}
        </Button>
      </div>
    );
  }
  if (!state) return <p className="py-20 text-center text-mute">{t.party.connecting}</p>;

  const { room, players } = state;
  const ctx: PartyContext = {
    state,
    myId,
    me: players.find((p) => p.userId === myId),
    isHost: room.hostId === myId,
    active: players.filter((p) => p.role === 'player'),
    nameOf: (id) => players.find((p) => p.userId === id)?.nickname ?? '?',
    act,
    busy,
    endsAtLocal,
    startedAtLocal: toLocal(room.phaseStartedAt),
    completedTopicIds,
  };
  const canLeave = room.phase === 'lobby' || room.phase === 'results';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{t.party.roomLabel(room.code, room.round)}</p>
        {canLeave && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void act(() => leaveRoom(room.id)).then(() => navigate('/party'))}
            icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
          >
            {t.party.leave}
          </Button>
        )}
      </div>
      {error && <ErrorBanner code={error} onDismiss={clearError} />}
      {/* Keyed so each phase (and each turn) mounts fresh with its entrance animation. */}
      <div key={`${room.round}-${room.phase}-${room.currentTurn}`} className="animate-fade-up">
        {room.phase === 'lobby' && <Lobby ctx={ctx} />}
        {room.phase === 'reveal' && <Reveal ctx={ctx} />}
        {room.phase === 'research' && <Research ctx={ctx} />}
        {room.phase === 'order' && <OrderReveal ctx={ctx} />}
        {(room.phase === 'upnext' || room.phase === 'speaking') && <Turn ctx={ctx} />}
        {room.phase === 'judging' && <Judging ctx={ctx} />}
        {room.phase === 'results' && <Results ctx={ctx} />}
      </div>
    </div>
  );
}
