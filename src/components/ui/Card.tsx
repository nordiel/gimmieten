import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'li';
  glow?: boolean;
}

export function Card({ as = 'div', glow = false, className = '', ...rest }: CardProps) {
  // The allowed tags share the same attribute set, so treat them as one for typing.
  const Tag = as as 'div';
  return (
    <Tag
      className={`rounded-3xl border bg-ink-800/80 backdrop-blur-sm ${
        glow ? 'border-lime/40 shadow-[0_0_60px_-20px_rgba(185,246,107,0.35)]' : 'border-ink-600'
      } ${className}`}
      {...rest}
    />
  );
}
