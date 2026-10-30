import { BotOff, CheckCircle2, Dices, Flag, Gavel, Mic, SkipForward } from 'lucide-react';
import { useState } from 'react';
import { PartyError, finishTurn, markDone, skipTopic, startTurn, submitRating } from '../../api/party';
import { CategoryBadge } from '../../components/CategoryBadge';
import { CountdownTimer } from '../../components/CountdownTimer';
import { ProgressBar } from '../../components/ProgressBar';
import { RatingControl } from '../../components/RatingControl';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TOPICS, getTopic } from '../../data/topics';
import { useNow } from '../../hooks/useNow';
import { localize, useI18n } from '../../i18n';
import { unlockAudio } from '../../lib/alerts';
import { AUTOSTART_SECONDS, PARTY_CRITERIA, type PartyCriterion, type PartyRatings } from '../../lib/party';
import { pickTopic } from '../../lib/random';
import { RESEARCH_MS } from '../../lib/rules';
import { PhaseCountdown, PlayerName, seconds, useRemaining, type PartyContext } from './shared';

function TopicHeading({ topicId, size = 'lg' }: { topicId: string | undefined; size?: 'lg' | 'md' }) {
  const { locale } = useI18n();
  const topic = topicId ? getTopic(topicId) : undefined;
  if (!topic) return null;
  return (
    <div>
      <CategoryBadge category={topic.category} />
      <h2
        className={`mt-4 text-balance font-bold leading-[1.05] ${
          size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
        }`}
      >
        {localize(topic.title, locale)}
      </h2>
      {topic.hint && <p className="mt-3 text-mute">{localize(topic.hint, locale)}</p>}
    </div>
  );
}

/** What a non-speaker sees while the speakers get their topics and research. */
function NotSpeaking({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  if (ctx.me?.role !== 'judge') return <p className="text-center text-mute">{t.party.spectating}</p>;
  return (
    <Card className="p-6 text-center sm:p-8">
      <Gavel className="mx-auto h-10 w-10 text-lime" aria-hidden="true" />
      <p className="mt-4 font-display text-2xl font-bold">{t.party.judgeRole}</p>
      <p className="mt-2 text-mute">{t.party.judgeResearching(ctx.active.map((p) => p.nickname))}</p>
    </Card>
  );
}

/** "3 of 5 ready", or a waiting note once I'm done. */
function DoneCount({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const done = ctx.active.filter((p) => p.done).length;
  return (
    <p className="text-center text-sm text-mute" aria-live="polite">
      {ctx.me?.done && <span className="block text-bone">{t.party.waitingForOthers}</span>}
      {t.party.readyCount(done, ctx.active.length)}
    </p>
  );
}

// ---------- Topic reveal ----------

export function Reveal({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const { state, myId, me, isHost, act, busy, endsAtLocal } = ctx;
  const { room } = state;
  const myTopic = state.topics[myId];
  const shared = room.topicMode === 'shared';
  const canSkip = me?.role === 'player' && !me.skipped && !me.done && (!shared || isHost);

  // Swap for a topic nobody in the room has this round (or had in earlier
  // rounds). Others' topics are hidden, so a collision is possible: retry.
  const skip = () =>
    act(async () => {
      const avoidIds = [...Object.values(state.topics), ...state.previousTopicIds];
      const completedIds = shared ? state.players.flatMap((p) => p.completedTopicIds) : ctx.completedTopicIds;
      for (let attempt = 0; attempt < 3; attempt++) {
        const topic = pickTopic(TOPICS, { category: room.category, completedIds, avoidIds });
        if (!topic) return;
        try {
          await skipTopic(room.id, topic.id);
          return;
        } catch (e) {
          if (!(e instanceof PartyError) || e.code !== 'topic_taken' || attempt === 2) throw e;
          avoidIds.push(topic.id);
        }
      }
    });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PhaseCountdown endsAtLocal={endsAtLocal} format={t.party.researchStartsIn} />
      {me?.role !== 'player' ? (
        <NotSpeaking ctx={ctx} />
      ) : (
        <>
          <Card glow className="p-6 sm:p-8">
            <p className="eyebrow mb-4">{shared ? t.party.sharedTopic : t.party.yourTopic}</p>
            <div key={myTopic} className="animate-fade-up">
              <TopicHeading topicId={myTopic} />
            </div>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              variant="secondary"
              disabled={!canSkip || busy}
              onClick={() => void skip()}
              icon={
                shared ? <Dices className="h-5 w-5" aria-hidden="true" /> : <SkipForward className="h-5 w-5" aria-hidden="true" />
              }
            >
              {shared ? t.party.reroll : t.party.skip}
            </Button>
            <Button
              size="lg"
              disabled={me.done || busy}
              onClick={() => {
                unlockAudio();
                void act(() => markDone(room.id));
              }}
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
            >
              {t.party.gotIt}
            </Button>
          </div>
          <DoneCount ctx={ctx} />
        </>
      )}
    </div>
  );
}

// ---------- Research ----------

export function Research({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const { state, myId, me, act, busy, endsAtLocal } = ctx;
  const remaining = useRemaining(endsAtLocal);
  // Lives only in this component, which unmounts when research ends: the
  // notes are gone for good and never leave the device.
  const [notes, setNotes] = useState('');

  const timer = (
    <Card className="p-6">
      <CountdownTimer
        remainingMs={remaining}
        totalMs={RESEARCH_MS}
        label={t.research.timerLabel}
        urgentBelowMs={60_000}
      />
      <ProgressBar
        value={1 - remaining / RESEARCH_MS}
        label={t.research.progressLabel}
        urgent={remaining <= 60_000}
        className="mt-6"
      />
      {me?.role === 'player' && (
        <Button
          size="lg"
          className="mt-6 w-full"
          disabled={me.done || busy}
          onClick={() => void act(() => markDone(state.room.id))}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        >
          {t.party.imDone}
        </Button>
      )}
    </Card>
  );

  if (me?.role !== 'player') {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <NotSpeaking ctx={ctx} />
        {timer}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <TopicHeading topicId={state.topics[myId]} />
        {timer}
        <DoneCount ctx={ctx} />
        <div className="flex items-center gap-3 rounded-2xl border border-alert/30 bg-alert/5 px-4 py-3">
          <BotOff className="h-5 w-5 shrink-0 text-alert" aria-hidden="true" />
          <p className="font-display font-bold text-bone">
            {t.research.noAi} <span className="text-mute">{t.research.noAiRest}</span>
          </p>
        </div>
      </div>

      <Card className="flex flex-col p-6">
        <label htmlFor="party-notes" className="font-display text-lg font-bold">
          {t.party.notesLabel}
        </label>
        <p className="mt-1 text-sm text-mute">{t.party.notesHelp}</p>
        <textarea
          id="party-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.research.notesPlaceholder}
          className="mt-4 min-h-[16rem] flex-1 resize-none rounded-2xl border border-ink-600 bg-ink-900/70 p-4 font-mono text-sm leading-relaxed text-bone placeholder:text-mute/60 focus:border-lime/60 focus:outline-none focus-visible:ring-0 lg:min-h-[24rem]"
        />
      </Card>
    </div>
  );
}

// ---------- Speaking order ----------

const SHUFFLE_MS = 2000;
const SHUFFLE_STEP_MS = 110;

export function OrderReveal({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const { state, nameOf, startedAtLocal } = ctx;
  const order = state.room.speakingOrder;
  const landsAt = startedAtLocal + SHUFFLE_MS;
  const now = useNow(Date.now() < landsAt, landsAt, SHUFFLE_STEP_MS);
  const elapsed = now - startedAtLocal;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const shuffling = !reduceMotion && elapsed < SHUFFLE_MS && order.length > 1;
  const shown = shuffling ? order[Math.floor(elapsed / SHUFFLE_STEP_MS) % order.length] : order[0];

  return (
    <div className="mx-auto max-w-xl space-y-8 text-center">
      <p className="eyebrow">{t.party.drawing}</p>
      <p
        key={shuffling ? 'shuffling' : 'landed'}
        className={`text-balance font-display text-5xl font-bold sm:text-6xl ${shuffling ? 'text-mute' : 'animate-pop text-lime'}`}
        aria-live="polite"
      >
        {shown && (shuffling ? nameOf(shown) : t.party.goesFirst(nameOf(shown)))}
      </p>
      {!shuffling && <SpeakingOrder ctx={ctx} />}
    </div>
  );
}

/** The full order, with the current speaker highlighted once turns begin. */
function SpeakingOrder({ ctx, current }: { ctx: PartyContext; current?: number }) {
  const { t } = useI18n();
  const { state, myId } = ctx;
  return (
    <Card as="section" className="animate-fade-up p-5 text-left" aria-labelledby="order-heading">
      <h3 id="order-heading" className="eyebrow mb-3">
        {t.party.order}
      </h3>
      <ol className="space-y-2">
        {state.room.speakingOrder.map((id, i) => {
          const player = state.players.find((p) => p.userId === id);
          return (
            <li
              key={id}
              aria-current={i === current ? 'step' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                i === current ? 'bg-lime/10 text-lime' : current !== undefined && i < current ? 'text-mute' : 'text-bone'
              }`}
            >
              <span className="tabular w-5 shrink-0 font-mono text-sm text-mute">{i + 1}</span>
              {player ? <PlayerName player={player} myId={myId} hostId={state.room.hostId} /> : <span>?</span>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ---------- Turns ----------

export function Turn({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const { state, myId, nameOf, act, busy, endsAtLocal } = ctx;
  const { room } = state;
  const speakerId = room.speakingOrder[room.currentTurn];
  const isSpeaker = speakerId === myId;
  const speaking = room.phase === 'speaking';
  const remaining = useRemaining(endsAtLocal);
  const name = speakerId ? nameOf(speakerId) : '?';
  // The server gives "up next" 15 s: a 5 s interstitial, then the auto-start countdown.
  const interstitial = !speaking && remaining > AUTOSTART_SECONDS * 1000;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <div>
          <p className="eyebrow mb-3">
            {speaking ? t.party.speakingNow(name) : isSpeaker && !interstitial ? t.party.youreUp : t.party.upNext}
          </p>
          {!speaking && (!isSpeaker || interstitial) && <p className="mb-4 font-display text-4xl font-bold text-lime">{name}</p>}
          <TopicHeading topicId={speakerId ? state.topics[speakerId] : undefined} size="md" />
        </div>

        {speaking ? (
          <Card className="p-6">
            <CountdownTimer
              remainingMs={remaining}
              totalMs={room.explainMinutes * 60_000}
              label={t.explain.timerLabel}
            />
            <p className="mt-6 text-center text-bone">{isSpeaker ? t.party.explainYourTopic : t.party.listenPrompt}</p>
            {isSpeaker && (
              <Button
                variant="secondary"
                size="lg"
                className="mt-6 w-full"
                disabled={busy}
                onClick={() => void act(() => finishTurn(room.id))}
                icon={<Flag className="h-5 w-5" aria-hidden="true" />}
              >
                {t.party.finishEarly}
              </Button>
            )}
          </Card>
        ) : (
          <Card glow={isSpeaker} className="space-y-4 p-6 text-center">
            {isSpeaker && !interstitial ? (
              <>
                <p className="text-bone">{t.party.explainYourTopic}</p>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    unlockAudio();
                    void act(() => startTurn(room.id));
                  }}
                  icon={<Mic className="h-5 w-5" aria-hidden="true" />}
                >
                  {t.party.startExplaining}
                </Button>
              </>
            ) : (
              <p className="text-bone">{isSpeaker ? t.party.explainYourTopic : t.party.listenPrompt}</p>
            )}
            {!interstitial && (
              <p className="tabular font-mono text-sm text-mute">{t.party.autoStartIn(seconds(remaining))}</p>
            )}
          </Card>
        )}
      </div>

      <SpeakingOrder ctx={ctx} current={room.currentTurn} />
    </div>
  );
}

// ---------- Judging ----------

export function Judging({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const { state, myId, me, nameOf, act, busy, endsAtLocal } = ctx;
  const { room } = state;
  const speakerId = room.speakingOrder[room.currentTurn];
  const isSpeaker = speakerId === myId;
  const [ratings, setRatings] = useState<Partial<PartyRatings>>({});
  const complete = PARTY_CRITERIA.every((c) => ratings[c] !== undefined);
  const copy = isSpeaker ? t.party.selfCriteria : t.party.criteria;
  const canRate = (me?.role === 'player' || me?.role === 'judge') && !state.ratedCurrentTurn;

  const submit = () => {
    if (!complete) return;
    void act(() => submitRating(room.id, ratings as PartyRatings));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <h2 className="text-balance text-4xl font-bold">
          {isSpeaker ? t.party.selfTitle : t.party.judgeTitle(speakerId ? nameOf(speakerId) : '?')}
        </h2>
        <div className="mt-2">
          <PhaseCountdown endsAtLocal={endsAtLocal} format={t.party.closesIn} />
        </div>
      </header>

      {me?.role === 'spectator' ? (
        <p className="text-center text-mute">{t.party.spectating}</p>
      ) : canRate ? (
        <Card className="space-y-8 p-6 sm:p-8">
          {PARTY_CRITERIA.map((c: PartyCriterion) => (
            <RatingControl
              key={c}
              label={copy[c].label}
              question={copy[c].question}
              value={ratings[c]}
              onChange={(v) => setRatings((r) => ({ ...r, [c]: v }))}
              disabled={busy}
            />
          ))}
          <Button size="lg" className="w-full" disabled={!complete || busy} onClick={submit}>
            {t.party.submit}
          </Button>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-lime" aria-hidden="true" />
          <p className="mt-4 text-bone">{t.party.waitingForOthers}</p>
        </Card>
      )}

      <p className="text-center text-sm text-mute" aria-live="polite">
        {t.party.judgedCount(room.ratingsCount, ctx.raters.length)}
      </p>
    </div>
  );
}
