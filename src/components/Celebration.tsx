import type { CSSProperties, ReactNode } from 'react';

const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const distance = 90 + (i % 3) * 40;
  return {
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    size: 6 + (i % 4) * 2,
    delay: (i % 5) * 40,
    square: i % 2 === 0,
  };
});

/** A one-shot burst of lime confetti behind its children. */
export function Celebration({ children }: { children: ReactNode }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className={`absolute animate-burst ${p.square ? 'rounded-sm bg-lime' : 'rounded-full bg-bone'}`}
            style={
              {
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}ms`,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {children}
    </div>
  );
}
