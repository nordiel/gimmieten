import type { ReactNode } from 'react';

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  accent?: boolean;
}

export function StatTile({ icon, label, value, accent = false }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800/80 p-4 sm:p-5">
      <div className={`flex items-center gap-2 ${accent ? 'text-lime' : 'text-mute'}`}>
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-[0.15em]">{label}</span>
      </div>
      <div className="tabular mt-2 font-display text-3xl font-bold text-bone sm:text-4xl">{value}</div>
    </div>
  );
}
