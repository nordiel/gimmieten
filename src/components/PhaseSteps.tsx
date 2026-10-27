import { Check } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Phase } from '../types';

const STEPS: Phase[] = ['setup', 'research', 'explain', 'results'];

export function PhaseSteps({ phase }: { phase: Phase }) {
  const { t } = useI18n();
  const currentIndex = STEPS.indexOf(phase);
  return (
    <ol className="flex items-center gap-2" aria-label={t.phases.label}>
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={step} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
            <span
              className={`flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                current
                  ? 'bg-lime text-ink'
                  : done
                    ? 'bg-lime/10 text-lime'
                    : 'bg-ink-700 text-mute'
              }`}
            >
              {done && <Check className="h-3 w-3" aria-hidden="true" />}
              <span className={current ? '' : 'hidden sm:inline'}>{t.phases.steps[step]}</span>
              {!current && <span className="sm:hidden">{i + 1}</span>}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-3 bg-ink-500 sm:w-6" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
