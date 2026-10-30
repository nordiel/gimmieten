import { Check, Copy, Lock, Share2, Unlock, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { kickPlayer, setLocked, setReady, updateSettings, type Room } from '../../api/party';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CATEGORIES } from '../../data/topics';
import { useI18n } from '../../i18n';
import { MAX_PLAYERS, MIN_PLAYERS, canStart } from '../../lib/party';
import { partyUrl } from '../../lib/route';
import { PlayerName, startRound, type PartyContext } from './shared';

export function Lobby({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const { state, myId, me, isHost, act, busy } = ctx;
  const { room, players } = state;
  const others = players.filter((p) => p.userId !== room.hostId);
  const everyoneReady = canStart(others.length ? players.map((p) => ({ id: p.userId, ready: p.ready || p.userId === room.hostId })) : []);
  const enoughPlayers = players.length >= MIN_PLAYERS;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <ShareCard code={room.code} />

        <Card as="section" className="p-6" aria-labelledby="players-heading">
          <h2 id="players-heading" className="text-2xl font-bold">
            {t.party.players(players.length, room.maxPlayers)}
          </h2>
          <ul className="mt-4 space-y-2">
            {players.map((p) => {
              const ready = p.ready || p.userId === room.hostId;
              return (
                <li key={p.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-ink-600 bg-ink-900/60 px-4 py-3">
                  <PlayerName player={p} myId={myId} hostId={room.hostId} />
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${
                        ready ? 'bg-lime/15 text-lime' : 'bg-ink-700 text-mute'
                      }`}
                    >
                      {ready ? t.party.ready : t.party.notReady}
                    </span>
                    {isHost && p.userId !== myId && (
                      <button
                        type="button"
                        aria-label={t.party.kick(p.nickname)}
                        disabled={busy}
                        onClick={() => void act(() => kickPlayer(room.id, p.userId))}
                        className="rounded-lg p-1.5 text-mute transition-colors hover:bg-alert/10 hover:text-alert"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {room.locked && <p className="mt-3 text-sm text-mute">{t.party.locked}</p>}
        </Card>
      </div>

      <div className="space-y-6">
        <Settings room={room} isHost={isHost} playerCount={players.length} ctx={ctx} />

        <div className="space-y-3">
          {isHost ? (
            <>
              {!enoughPlayers ? (
                <p className="text-center text-mute">{t.party.needPlayers}</p>
              ) : everyoneReady ? (
                <Button size="lg" className="w-full" disabled={busy} onClick={() => void startRound(ctx)}>
                  {t.party.start}
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="secondary" className="w-full" disabled={busy} onClick={() => void startRound(ctx, true)}>
                    {t.party.startAnyway}
                  </Button>
                  <p className="text-center text-sm text-mute">{t.party.startAnywayHelp}</p>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={busy}
                onClick={() => void act(() => setLocked(room.id, !room.locked))}
                icon={room.locked ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
              >
                {room.locked ? t.party.unlock : t.party.lock}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant={me?.ready ? 'secondary' : 'primary'}
                className="w-full"
                disabled={busy}
                onClick={() => void act(() => setReady(room.id, !me?.ready))}
                icon={me?.ready ? undefined : <Check className="h-5 w-5" aria-hidden="true" />}
              >
                {me?.ready ? t.party.unready : t.party.imReady}
              </Button>
              <p className="text-center text-sm text-mute">{t.party.waitingForHost}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareCard({ code }: { code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = partyUrl(code);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is still visible to copy by hand.
    }
  };

  return (
    <Card as="section" glow className="p-6" aria-labelledby="share-heading">
      <h2 id="share-heading" className="text-2xl font-bold">
        {t.party.shareTitle}
      </h2>
      <p className="mt-1 text-sm text-mute">{t.party.shareHelp}</p>
      <p className="tabular mt-5 text-center font-mono text-5xl font-bold tracking-[0.25em] text-lime sm:text-6xl" aria-label={`${t.party.codeLabel}: ${code.split('').join(' ')}`}>
        {code}
      </p>
      <p className="mt-2 break-all text-center font-mono text-xs text-mute">{url}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => void copy()} icon={copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}>
          <span aria-live="polite">{copied ? t.party.copied : t.party.copyLink}</span>
        </Button>
        {canShare && (
          <Button
            variant="secondary"
            onClick={() => void navigator.share({ title: 'GimmieFive', text: t.party.shareText(code), url }).catch(() => undefined)}
            icon={<Share2 className="h-4 w-4" aria-hidden="true" />}
          >
            {t.party.share}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Settings({ room, isHost, playerCount, ctx }: { room: Room; isHost: boolean; playerCount: number; ctx: PartyContext }) {
  const { t } = useI18n();
  const current = { topicMode: room.topicMode, category: room.category, explainMinutes: room.explainMinutes, maxPlayers: room.maxPlayers };
  const change = (patch: Partial<typeof current>) => void ctx.act(() => updateSettings(room.id, { ...current, ...patch }));
  const disabled = !isHost || ctx.busy;

  return (
    <Card as="section" className="space-y-5 p-6" aria-labelledby="settings-heading">
      <div>
        <h2 id="settings-heading" className="text-2xl font-bold">
          {t.party.settings}
        </h2>
        {!isHost && <p className="mt-1 text-sm text-mute">{t.party.hostControls}</p>}
      </div>

      <Field label={t.party.topicMode}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['own', 'shared'] as const).map((mode) => (
            <Choice
              key={mode}
              selected={room.topicMode === mode}
              disabled={disabled}
              onClick={() => change({ topicMode: mode })}
              title={mode === 'own' ? t.party.topicOwn : t.party.topicShared}
              help={mode === 'own' ? t.party.topicOwnHelp : t.party.topicSharedHelp}
            />
          ))}
        </div>
      </Field>

      <Field label={t.party.explainTime}>
        <div className="grid grid-cols-2 gap-2">
          {([1, 2] as const).map((m) => (
            <Choice key={m} selected={room.explainMinutes === m} disabled={disabled} onClick={() => change({ explainMinutes: m })} title={t.common.minutes(m)} />
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.party.category} htmlFor="party-category">
          <select
            id="party-category"
            value={room.category}
            disabled={disabled}
            onChange={(e) => change({ category: e.target.value as Room['category'] })}
            className="w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-bone disabled:opacity-60"
          >
            <option value="all">{t.party.everything}</option>
            {CATEGORIES.map((id) => (
              <option key={id} value={id}>
                {t.categories[id].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.party.roomSize} htmlFor="party-size">
          <select
            id="party-size"
            value={room.maxPlayers}
            disabled={disabled}
            onChange={(e) => change({ maxPlayers: Number(e.target.value) })}
            className="w-full rounded-xl border border-ink-500 bg-ink-700 px-3 py-2.5 text-bone disabled:opacity-60"
          >
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS)
              .filter((n) => n >= playerCount)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </select>
        </Field>
      </div>
    </Card>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="eyebrow mb-2 block">
          {label}
        </label>
      ) : (
        <p className="eyebrow mb-2">{label}</p>
      )}
      {children}
    </div>
  );
}

function Choice({ selected, disabled, onClick, title, help }: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  help?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-default ${
        selected ? 'border-lime bg-lime/10 text-lime' : 'border-ink-500 bg-ink-700 text-bone enabled:hover:border-lime/50'
      } ${disabled && !selected ? 'opacity-60' : ''}`}
    >
      <span className="block font-display font-bold">{title}</span>
      {help && <span className="mt-0.5 block text-xs text-mute">{help}</span>}
    </button>
  );
}
