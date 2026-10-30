import { ArrowLeft, LogIn, PartyPopper, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { PartyError, createRoom, ensureSession, joinRoom, peekRoom, type RoomPeek } from '../../api/party';
import { isBackendConfigured } from '../../api/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useI18n } from '../../i18n';
import { normalizeRoomCode, validateNickname } from '../../lib/party';
import { navigate } from '../../lib/route';
import { PartyRoom } from './PartyRoom';
import { ErrorBanner } from './shared';

const NICKNAME_KEY = 'gimmiefive.party.nickname';

function rememberedNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // Only a convenience.
  }
}

const NICKNAME_ERRORS = {
  tooShort: 'nickname_too_short',
  tooLong: 'nickname_too_long',
  invalidCharacters: 'nickname_invalid',
  taken: 'nickname_taken',
} as const;

/** Client-side nickname check; returns the cleaned nickname or throws a PartyError. */
function cleanNickname(raw: string): string {
  const result = validateNickname(raw);
  if (!result.ok) throw new PartyError(NICKNAME_ERRORS[result.error]);
  return result.nickname;
}

interface PartyPageProps {
  code: string | null;
  completedTopicIds: string[];
}

export function PartyPage(props: PartyPageProps) {
  const { t } = useI18n();
  if (!isBackendConfigured()) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-lime" aria-hidden="true" />
        <p className="mt-4 text-mute">{t.party.notConfigured}</p>
      </Card>
    );
  }
  return <PartySession {...props} />;
}

function PartySession({ code, completedTopicIds }: PartyPageProps) {
  const { t } = useI18n();
  const [myId, setMyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ensureSession()
      .then(setMyId)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <ErrorBanner code="sign_in_failed" />;
  if (!myId) return <p className="py-20 text-center text-mute">{t.party.connecting}</p>;
  if (!code) return <PartyStart completedTopicIds={completedTopicIds} />;
  return <RoomGate key={code} code={code} myId={myId} completedTopicIds={completedTopicIds} />;
}

function PartyStart({ completedTopicIds }: { completedTopicIds: string[] }) {
  const { t } = useI18n();
  const [nickname, setNickname] = useState(rememberedNickname);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof PartyError ? e.code : 'network');
    } finally {
      setBusy(false);
    }
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const name = cleanNickname(nickname);
      const roomCode = await createRoom(name, completedTopicIds);
      rememberNickname(name);
      navigate(`/party/${roomCode}`);
    });
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const roomCode = normalizeRoomCode(code);
      if (!roomCode) throw new PartyError('invalid_code');
      const name = cleanNickname(nickname);
      await joinRoom(roomCode, name, completedTopicIds);
      rememberNickname(name);
      navigate(`/party/${roomCode}`);
    });
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="animate-fade-up">
        <p className="eyebrow">{t.party.title}</p>
        <h1 className="mt-3 text-balance text-5xl font-bold sm:text-6xl">{t.party.subtitle}</h1>
      </header>

      <div>
        <label htmlFor="party-nickname" className="font-display text-lg font-bold">
          {t.party.nicknameLabel}
        </label>
        <input
          id="party-nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t.party.nicknamePlaceholder}
          maxLength={20}
          autoComplete="nickname"
          className="mt-2 block w-full max-w-sm rounded-2xl border border-ink-500 bg-ink-800 px-4 py-3 text-lg text-bone placeholder:text-mute/60 focus:border-lime/60 focus:outline-none"
        />
      </div>

      {error && <ErrorBanner code={error} onDismiss={() => setError(null)} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Card as="section" glow className="flex flex-col p-6 sm:p-8">
          <Users className="h-7 w-7 text-lime" aria-hidden="true" />
          <h2 className="mt-4 text-3xl font-bold">{t.party.createTitle}</h2>
          <p className="mt-1 text-mute">{t.party.createHelp}</p>
          <form onSubmit={create} className="mt-auto pt-6">
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {t.party.create}
            </Button>
          </form>
        </Card>

        <Card as="section" className="p-6 sm:p-8">
          <LogIn className="h-7 w-7 text-lime" aria-hidden="true" />
          <h2 className="mt-4 text-3xl font-bold">{t.party.joinTitle}</h2>
          <p className="mt-1 text-mute">{t.party.joinHelp}</p>
          <form onSubmit={join} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="party-code" className="sr-only">
              {t.party.codeLabel}
            </label>
            <input
              id="party-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC234"
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              className="tabular min-w-0 flex-1 rounded-2xl border border-ink-500 bg-ink-900 px-4 py-3 font-mono text-2xl tracking-[0.3em] text-bone placeholder:text-mute/40 focus:border-lime/60 focus:outline-none"
            />
            <Button type="submit" size="lg" variant="secondary" disabled={busy}>
              {t.party.join}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

/** Resolves /party/CODE: straight into the room for members, otherwise a join form. */
function RoomGate({ code, myId, completedTopicIds }: { code: string; myId: string; completedTopicIds: string[] }) {
  const { t } = useI18n();
  const roomCode = normalizeRoomCode(code);
  const [peek, setPeek] = useState<RoomPeek | null | 'loading'>('loading');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nickname, setNickname] = useState(rememberedNickname);
  const [error, setError] = useState<string | null>(roomCode ? null : 'invalid_code');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    peekRoom(roomCode)
      .then((result) => {
        setPeek(result);
        if (result?.roomId) setRoomId(result.roomId);
      })
      .catch(() => setError('network'));
  }, [roomCode]);

  if (roomId) return <PartyRoom roomId={roomId} myId={myId} completedTopicIds={completedTopicIds} />;

  const back = (
    <Button variant="ghost" onClick={() => navigate('/party')} icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
      {t.party.back}
    </Button>
  );
  if (!roomCode || peek === null) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <ErrorBanner code={roomCode ? 'room_not_found' : 'invalid_code'} />
        {back}
      </div>
    );
  }
  if (peek === 'loading') return <p className="py-20 text-center text-mute">{t.party.connecting}</p>;

  const blocked =
    peek.phase !== 'lobby' ? 'room_started' : peek.locked ? 'room_locked' : peek.players >= peek.maxPlayers ? 'room_full' : null;

  const join = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    (async () => {
      const name = cleanNickname(nickname);
      const id = await joinRoom(roomCode, name, completedTopicIds);
      rememberNickname(name);
      setRoomId(id);
    })()
      .catch((err) => setError(err instanceof PartyError ? err.code : 'network'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-10">
      <p className="eyebrow">{t.party.title}</p>
      <h1 className="text-5xl font-bold">{t.party.joiningRoom(roomCode)}</h1>
      {(error || blocked) && <ErrorBanner code={(error ?? blocked)!} />}
      {!blocked && (
        <Card className="p-6">
          <form onSubmit={join} className="space-y-4">
            <label htmlFor="join-nickname" className="font-display text-lg font-bold">
              {t.party.nicknameLabel}
            </label>
            <input
              id="join-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.party.nicknamePlaceholder}
              maxLength={20}
              autoComplete="nickname"
              autoFocus
              className="block w-full rounded-2xl border border-ink-500 bg-ink-900 px-4 py-3 text-lg text-bone placeholder:text-mute/60 focus:border-lime/60 focus:outline-none"
            />
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {t.party.join}
            </Button>
          </form>
        </Card>
      )}
      {back}
    </div>
  );
}
