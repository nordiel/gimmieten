import { useI18n } from '../i18n';
import { formatClock } from '../lib/timer';

interface CountdownTimerProps {
  remainingMs: number;
  totalMs: number;
  label: string;
  /** Switch to urgent styling below this many ms. */
  urgentBelowMs?: number;
  paused?: boolean;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownTimer({
  remainingMs,
  totalMs,
  label,
  urgentBelowMs = 10_000,
  paused = false,
}: CountdownTimerProps) {
  const { t } = useI18n();
  const fraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const done = remainingMs <= 0;
  const urgent = !done && remainingMs <= urgentBelowMs;
  const clock = formatClock(remainingMs);
  const stroke = done || urgent ? '#FF6B5B' : '#B9F66B';

  return (
    <div
      role="timer"
      aria-label={t.timer.remaining(label, clock, paused)}
      className="relative mx-auto aspect-square w-full max-w-[19rem]"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#2a2a37" strokeWidth="3" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-200 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span
          className={`tabular font-mono text-6xl font-bold sm:text-7xl ${
            done || urgent ? 'text-alert' : 'text-bone'
          } ${urgent && !paused ? 'animate-urgent' : ''}`}
        >
          {clock}
        </span>
        <span className="eyebrow mt-2">{done ? t.timer.timesUp : paused ? t.timer.paused : label}</span>
      </div>
    </div>
  );
}
