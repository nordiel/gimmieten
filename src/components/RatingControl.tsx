import { useId } from 'react';
import { useI18n } from '../i18n';

interface RatingControlProps {
  label: string;
  question: string;
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const VALUES = [1, 2, 3, 4, 5];

/** A 1–5 rating built on native radio inputs, so arrow keys and screen readers just work. */
export function RatingControl({ label, question, value, onChange, disabled = false }: RatingControlProps) {
  const name = useId();
  const { t } = useI18n();
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="w-full">
        <span className="block font-display text-lg font-bold text-bone">{label}</span>
        <span className="block text-sm text-mute">{question}</span>
      </legend>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {VALUES.map((n) => {
          const selected = value === n;
          return (
            <label key={n} className="group relative cursor-pointer has-[:disabled]:cursor-default">
              <input
                type="radio"
                name={name}
                value={n}
                checked={selected}
                onChange={() => onChange(n)}
                className="peer sr-only"
                aria-label={t.ratingAria(label, n)}
              />
              <span
                className={`flex h-12 items-center justify-center rounded-xl border font-mono text-lg font-bold transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-lime peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ink ${
                  selected
                    ? 'animate-pop border-lime bg-lime text-ink'
                    : value !== undefined && n < value
                      ? 'border-lime/40 bg-lime/10 text-lime'
                      : 'border-ink-500 bg-ink-700 text-mute group-hover:border-lime/50 group-hover:text-bone'
                }`}
              >
                {n}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
