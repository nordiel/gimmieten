export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display text-xl font-bold tracking-tight ${className}`}>
      <span className="text-bone">Gimmie</span>
      <span className="rounded-md bg-lime px-1.5 py-0.5 text-ink">Five</span>
    </span>
  );
}
