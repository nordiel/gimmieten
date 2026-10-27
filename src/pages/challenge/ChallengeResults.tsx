import { Check, Home, RotateCcw, Save, Trophy } from 'lucide-react';
import { useState } from 'react';
import { CategoryBadge } from '../../components/CategoryBadge';
import { Celebration } from '../../components/Celebration';
import { ConfirmInline } from '../../components/ConfirmInline';
import { RatingControl } from '../../components/RatingControl';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { localize, useI18n } from '../../i18n';
import { RATING_KEYS, isCompleteRatings, scoreTier, selfAssessmentScore } from '../../lib/score';
import { elapsedMs, formatClock } from '../../lib/timer';
import type { RatingKey, Ratings, TimerState, Topic } from '../../types';

interface ChallengeResultsProps {
  topic: Topic;
  explainMinutes: number;
  explainTimer: TimerState;
  ratings: Partial<Ratings>;
  saved: boolean;
  onRate: (key: RatingKey, value: number) => void;
  onSave: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function ChallengeResults({
  topic,
  explainMinutes,
  explainTimer,
  ratings,
  saved,
  onRate,
  onSave,
  onPlayAgain,
  onHome,
}: ChallengeResultsProps) {
  const { t, locale } = useI18n();
  const [pendingLeave, setPendingLeave] = useState<'again' | 'home' | null>(null);
  const complete = isCompleteRatings(ratings);
  const score = complete ? selfAssessmentScore(ratings) : null;
  const rated = RATING_KEYS.filter((k) => ratings[k] !== undefined).length;
  const used = formatClock(elapsedMs(explainTimer, Date.now()));

  const leave = (target: 'again' | 'home') => {
    if (!saved) {
      setPendingLeave(target);
      return;
    }
    if (target === 'again') onPlayAgain();
    else onHome();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <Celebration>
          <div className="relative flex h-20 w-20 animate-pop items-center justify-center rounded-3xl bg-lime text-ink">
            <Trophy className="h-10 w-10" strokeWidth={2.25} aria-hidden="true" />
          </div>
        </Celebration>
        <h2 className="mt-6 text-5xl font-bold sm:text-6xl">{t.results.heading}</h2>
        <p className="mt-3 text-lg text-mute">{t.results.subheading}</p>
      </header>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <CategoryBadge category={topic.category} />
            <h3 className="mt-3 text-balance text-2xl font-bold sm:text-3xl">{localize(topic.title, locale)}</h3>
            <p className="mt-2 font-mono text-sm text-mute">{t.results.durationLine(explainMinutes, used)}</p>
          </div>
          <div className="shrink-0 text-left sm:text-right" aria-live="polite">
            <p className="eyebrow">{t.results.selfAssessment}</p>
            {score === null ? (
              <p className="mt-1 font-display text-lg text-mute">{t.results.rateMore(RATING_KEYS.length - rated)}</p>
            ) : (
              <p key={score} className="tabular mt-1 animate-pop font-display text-6xl font-bold text-lime">
                {score}%
              </p>
            )}
          </div>
        </div>
        {score !== null && (
          <p className="mt-4 border-t border-ink-600 pt-4 text-bone">{t.results.scoreMessages[scoreTier(score)]}</p>
        )}
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="grid gap-8 sm:grid-cols-2">
          {RATING_KEYS.map((key) => (
            <RatingControl
              key={key}
              label={t.ratings[key].label}
              question={t.ratings[key].question}
              value={ratings[key]}
              onChange={(v) => onRate(key, v)}
              disabled={saved}
            />
          ))}
        </div>
        <p className="mt-8 text-xs text-mute">{t.results.disclaimer}</p>
      </Card>

      <div className="space-y-3">
        <Button
          size="lg"
          onClick={onSave}
          disabled={!complete || saved}
          icon={saved ? <Check className="h-5 w-5" aria-hidden="true" /> : <Save className="h-5 w-5" aria-hidden="true" />}
          className={`w-full ${saved ? 'border border-lime/40 !bg-lime/10 !text-lime !opacity-100 !shadow-none' : ''}`}
        >
          {saved ? t.results.saved : complete ? t.results.save : t.results.rateAll}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => leave('again')} icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}>
            {t.results.playAgain}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => leave('home')} icon={<Home className="h-5 w-5" aria-hidden="true" />}>
            {t.results.home}
          </Button>
        </div>
        {pendingLeave && (
          <ConfirmInline
            message={t.results.unsavedConfirm}
            confirmLabel={t.results.discard}
            onConfirm={() => {
              setPendingLeave(null);
              if (pendingLeave === 'again') onPlayAgain();
              else onHome();
            }}
            onCancel={() => setPendingLeave(null)}
          />
        )}
      </div>
    </div>
  );
}
