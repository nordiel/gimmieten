import { RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PartyError, fetchRoundRatings } from '../../api/party';
import { Celebration } from '../../components/Celebration';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getTopic } from '../../data/topics';
import { localize, useI18n } from '../../i18n';
import { PARTY_CRITERIA, roundAwards, scoreRound, type AwardKind, type PartyRating, type SpeakerScore } from '../../lib/party';
import { ErrorBanner, PlayerName, startRound, type PartyContext } from './shared';

const AWARD_EMOJI: Record<AwardKind, string> = {
  bestTeacher: '🏆',
  mostConfident: '💪',
  taughtMost: '💡',
  humbleGenius: '🙈',
};

export function Results({ ctx }: { ctx: PartyContext }) {
  const { t } = useI18n();
  const { state, isHost, busy } = ctx;
  const { room } = state;
  const [ratings, setRatings] = useState<PartyRating[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRoundRatings(room.id, room.round)
      .then((r) => !cancelled && setRatings(r))
      .catch((e) => !cancelled && setError(e instanceof PartyError ? e.code : 'network'));
    return () => {
      cancelled = true;
    };
  }, [room.id, room.round]);

  const scores = ratings ? scoreRound(room.speakingOrder, ratings) : null;
  const awards = scores ? roundAwards(scores) : [];
  // Awards are a contest; with one speaker there's nobody to compare against.
  const soloSpeaker = room.speakingOrder.length === 1;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <Celebration>
          <div className="relative flex h-20 w-20 animate-pop items-center justify-center rounded-3xl bg-lime text-ink">
            <Trophy className="h-10 w-10" strokeWidth={2.25} aria-hidden="true" />
          </div>
        </Celebration>
        <h2 className="mt-6 text-5xl font-bold sm:text-6xl">{t.party.resultsTitle}</h2>
      </header>

      {error && <ErrorBanner code={error} />}
      {!scores && !error && <p className="text-center text-mute">{t.party.tallying}</p>}

      {scores && (
        <>
          {!soloSpeaker && (
            <Card as="section" className="p-6 sm:p-8" aria-labelledby="awards-heading">
              <h3 id="awards-heading" className="text-2xl font-bold">
                {t.party.awardsTitle}
              </h3>
              {awards.length === 0 ? (
                <p className="mt-3 text-mute">{t.party.noAwards}</p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {awards.map((award) => (
                    <li key={award.kind} className="flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/5 px-4 py-3">
                      <span className="text-3xl" aria-hidden="true">
                        {AWARD_EMOJI[award.kind]}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display font-bold text-lime">{t.party.awards[award.kind]}</span>
                        <span className="block truncate text-bone">{award.playerIds.map(ctx.nameOf).join(', ')}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <ul className="space-y-3">
            {scores.map((score) => (
              <ScoreRow key={score.playerId} ctx={ctx} score={score} />
            ))}
          </ul>
          <p className="text-center text-xs text-mute">{t.party.disclaimer}</p>
        </>
      )}

      {isHost ? (
        <Button
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() => void startRound(ctx)}
          icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
        >
          {t.party.playAgain}
        </Button>
      ) : (
        <p className="text-center text-mute">{t.party.waitingPlayAgain}</p>
      )}
    </div>
  );
}

function ScoreRow({ ctx, score }: { ctx: PartyContext; score: SpeakerScore }) {
  const { t, locale } = useI18n();
  const { state, myId } = ctx;
  const player = state.players.find((p) => p.userId === score.playerId);
  const topicId = state.topics[score.playerId];
  const topic = topicId ? getTopic(topicId) : undefined;
  const isMe = score.playerId === myId;

  return (
    <Card as="li" glow={isMe} className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {player ? <PlayerName player={player} myId={myId} hostId={state.room.hostId} /> : <span>?</span>}
          {topic && <p className="mt-1 truncate text-sm text-mute">{localize(topic.title, locale)}</p>}
        </div>
        <div className="flex shrink-0 gap-6">
          <Score label={t.party.roomScore} value={score.roomScore} highlight />
          <Score label={t.party.selfScore} value={score.selfScore} />
        </div>
      </div>
      {score.judges > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-ink-600 pt-4">
          {PARTY_CRITERIA.map((c) => (
            <div key={c} className="min-w-0">
              <dt className="truncate text-xs text-mute">{t.party.criteria[c].label}</dt>
              <dd className="tabular font-mono text-lg font-bold text-bone">
                {score.criteria[c] === null ? '–' : t.party.outOfFive(score.criteria[c]!.toFixed(1))}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {isMe && score.gap !== null && (
        <p className="mt-4 border-t border-ink-600 pt-4 text-bone">
          {score.gap < 0 ? t.party.underrated(-score.gap) : score.gap > 0 ? t.party.overrated(score.gap) : t.party.spotOn}
        </p>
      )}
    </Card>
  );
}

function Score({ label, value, highlight = false }: { label: string; value: number | null; highlight?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="text-left sm:text-right">
      <p className="eyebrow">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm text-mute">{t.party.noRatings}</p>
      ) : (
        <p className={`tabular mt-1 font-display text-3xl font-bold ${highlight ? 'text-lime' : 'text-bone'}`}>{value}%</p>
      )}
    </div>
  );
}
