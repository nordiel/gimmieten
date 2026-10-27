import { Mic, Play, Search, SkipForward } from 'lucide-react';
import { ChallengeCard } from '../../components/ChallengeCard';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';
import type { Topic } from '../../types';

interface ChallengeSetupProps {
  topic: Topic;
  explainMinutes: number;
  skips: number;
  onStart: () => void;
  onSkip: () => void;
}

export function ChallengeSetup({ topic, explainMinutes, skips, onStart, onSkip }: ChallengeSetupProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <p className="eyebrow">{t.setup.eyebrow}</p>
      <ChallengeCard topic={topic}>
        <dl className="mt-10 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-ink-600 bg-ink-900/60 p-4">
            <Search className="h-6 w-6 shrink-0 text-mute" aria-hidden="true" />
            <div>
              <dt className="eyebrow">{t.setup.research}</dt>
              <dd className="font-display text-2xl font-bold">{t.setup.researchValue}</dd>
            </div>
          </div>
          <div className="flex animate-pop items-center gap-4 rounded-2xl border border-lime/40 bg-lime/10 p-4">
            <Mic className="h-6 w-6 shrink-0 text-lime" aria-hidden="true" />
            <div>
              <dt className="eyebrow text-lime">{t.setup.explainFor}</dt>
              <dd className="font-display text-2xl font-bold text-lime">{t.common.minutes(explainMinutes)}</dd>
            </div>
          </div>
        </dl>
      </ChallengeCard>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" size="lg" onClick={onSkip} icon={<SkipForward className="h-5 w-5" aria-hidden="true" />}>
          {t.setup.skip(skips)}
        </Button>
        <Button size="lg" onClick={onStart} icon={<Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />}>
          {t.setup.start}
        </Button>
      </div>
      <p className="text-center text-sm text-mute sm:text-right">{t.setup.note}</p>
    </div>
  );
}
