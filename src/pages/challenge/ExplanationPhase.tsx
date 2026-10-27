import { AlarmClock, ArrowRight, Flag, Mic, Pause, Play } from 'lucide-react';
import { CategoryBadge } from '../../components/CategoryBadge';
import { CountdownTimer } from '../../components/CountdownTimer';
import { ProgressBar } from '../../components/ProgressBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useNow } from '../../hooks/useNow';
import { localize, useI18n } from '../../i18n';
import { deadline, isExpired, isRunning, remainingMs } from '../../lib/timer';
import type { TimerState, Topic } from '../../types';

interface ExplanationPhaseProps {
  // Deliberately no notes prop: this screen has no way to show them.
  topic: Topic;
  timer: TimerState;
  explainMinutes: number;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
}

export function ExplanationPhase({ topic, timer, explainMinutes, onStart, onPause, onFinish }: ExplanationPhaseProps) {
  const { t, locale } = useI18n();
  const now = useNow(isRunning(timer), deadline(timer));
  const remaining = remainingMs(timer, now);
  const expired = isExpired(timer, now);
  const running = isRunning(timer) && !expired;

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <div>
        <CategoryBadge category={topic.category} />
        <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-6xl">{localize(topic.title, locale)}</h2>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-lime/30 bg-lime/5 p-4 text-left">
        <Mic className="mt-0.5 h-5 w-5 shrink-0 text-lime" aria-hidden="true" />
        <p className="text-bone">
          <span className="font-display font-bold">{t.explain.instruction}</span>{' '}
          <span className="text-mute">{t.explain.instructionRest(t.common.minutes(explainMinutes))}</span>
        </p>
      </div>

      <Card glow={expired} className="p-6 sm:p-8">
        <CountdownTimer
          remainingMs={remaining}
          totalMs={timer.durationMs}
          label={t.explain.timerLabel}
          urgentBelowMs={10_000}
          paused={timer.started && !running && !expired}
        />
        <ProgressBar
          value={1 - remaining / timer.durationMs}
          label={t.explain.progressLabel}
          urgent={remaining <= 10_000}
          className="mt-6"
        />

        <div aria-live="polite" className="mt-6">
          {expired ? (
            <div className="animate-pop space-y-4">
              <p className="flex items-center justify-center gap-2 font-display text-3xl font-bold text-alert">
                <AlarmClock className="h-7 w-7" aria-hidden="true" />
                {t.explain.timesUp}
              </p>
              <Button size="lg" onClick={onFinish} iconRight={<ArrowRight className="h-5 w-5" aria-hidden="true" />} className="w-full" autoFocus>
                {t.explain.seeResults}
              </Button>
            </div>
          ) : !timer.started ? (
            <Button size="lg" onClick={onStart} icon={<Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />} className="w-full">
              {t.explain.start}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {running ? (
                <Button variant="secondary" size="lg" onClick={onPause} icon={<Pause className="h-5 w-5" aria-hidden="true" />}>
                  {t.explain.pause}
                </Button>
              ) : (
                <Button variant="secondary" size="lg" onClick={onStart} icon={<Play className="h-5 w-5" aria-hidden="true" />}>
                  {t.explain.resume}
                </Button>
              )}
              <Button size="lg" onClick={onFinish} icon={<Flag className="h-5 w-5" aria-hidden="true" />}>
                {t.explain.finish}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
