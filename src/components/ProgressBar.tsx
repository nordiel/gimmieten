interface ProgressBarProps {
  /** 0–1 */
  value: number;
  label: string;
  urgent?: boolean;
  className?: string;
}

export function ProgressBar({ value, label, urgent = false, className = '' }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-2 w-full overflow-hidden rounded-full bg-ink-600 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-alert' : 'bg-lime'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
