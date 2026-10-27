import { BotOff, CheckCircle2, Pause, Play } from 'lucide-react';
import { useEffect } from 'react';
import { CategoryBadge } from '../../components/CategoryBadge';
import { CountdownTimer } from '../../components/CountdownTimer';
import { ProgressBar } from '../../components/ProgressBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useNow } from '../../hooks/useNow';
import { localize, useI18n } from '../../i18n';
import { deadline, isExpired, isRunning, remainingMs } from '../../lib/timer';
import type { TimerState, Topic } from '../../types';

interface ResearchPhaseProps {
  topic: Topic;
  timer: TimerState;
  notes: string;
  explainMinutes: number;
  onNotesChange: (notes: string) => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}

export function ResearchPhase({
  topic,
  timer,
  notes,
  explainMinutes,
  onNotesChange,
  onPause,
  onResume,
  onFinish,
}: ResearchPhaseProps) {
  const { t, locale } = useI18n();
  const running = isRunning(timer);
  const now = useNow(running, deadline(timer));
  const remaining = remainingMs(timer, now);
  const expired = isExpired(timer, now);
  const topicTitle = localize(topic.title, locale);

  // Covers both live expiry and returning to the page after the clock ran out.
  useEffect(() => {
    if (expired) onFinish();
  }, [expired, onFinish]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <div>
          <CategoryBadge category={topic.category} />
          <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">{topicTitle}</h2>
          {topic.hint && <p className="mt-3 text-mute">{localize(topic.hint, locale)}</p>}
        </div>

        <Card className="p-6">
          <CountdownTimer
            remainingMs={remaining}
            totalMs={timer.durationMs}
            label={t.research.timerLabel}
            urgentBelowMs={60_000}
            paused={!running}
          />
          <ProgressBar
            value={1 - remaining / timer.durationMs}
            label={t.research.progressLabel}
            urgent={remaining <= 60_000}
            className="mt-6"
          />
          <div className="mt-6 grid grid-cols-2 gap-3">
            {running ? (
              <Button variant="secondary" onClick={onPause} icon={<Pause className="h-4 w-4" aria-hidden="true" />}>
                {t.research.pause}
              </Button>
            ) : (
              <Button variant="secondary" onClick={onResume} icon={<Play className="h-4 w-4" aria-hidden="true" />}>
                {t.research.resume}
              </Button>
            )}
            <Button onClick={onFinish} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}>
              {t.research.ready}
            </Button>
          </div>
        </Card>

        <div className="flex items-center gap-3 rounded-2xl border border-alert/30 bg-alert/5 px-4 py-3">
          <BotOff className="h-5 w-5 shrink-0 text-alert" aria-hidden="true" />
          <p className="font-display font-bold text-bone">
            {t.research.noAi} <span className="text-mute">{t.research.noAiRest}</span>
          </p>
        </div>
      </div>

      <Card className="flex flex-col p-6">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="research-notes" className="font-display text-lg font-bold">
            {t.research.notesLabel}
          </label>
          <span className="eyebrow">{t.research.optional}</span>
        </div>
        <p className="mt-1 text-sm text-mute">{t.research.notesHelp(t.common.minutes(explainMinutes))}</p>
        <textarea
          id="research-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t.research.notesPlaceholder}
          className="mt-4 min-h-[16rem] flex-1 resize-none rounded-2xl border border-ink-600 bg-ink-900/70 p-4 font-mono text-sm leading-relaxed text-bone placeholder:text-mute/60 focus:border-lime/60 focus:outline-none focus-visible:ring-0 lg:min-h-[24rem]"
        />
      </Card>
    </div>
  );
}
