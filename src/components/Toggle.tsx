import { useId, type ReactNode } from 'react';

interface ToggleProps {
  label: string;
  description: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled = false }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-display text-lg font-bold">
          {label}
        </label>
        <div id={`${id}-description`} className="mt-0.5 text-sm text-mute">
          {description}
        </div>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-description`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-8 w-14 shrink-0 rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? 'border-lime bg-lime' : 'border-ink-500 bg-ink-700 hover:border-lime/50'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-1 top-1 h-[1.375rem] w-[1.375rem] rounded-full transition-transform duration-150 ${
            checked ? 'translate-x-6 bg-ink' : 'translate-x-0 bg-mute'
          }`}
        />
      </button>
    </div>
  );
}
