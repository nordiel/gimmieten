import { useI18n } from '../i18n';
import type { CategoryId } from '../types';

export function CategoryBadge({ category }: { category: CategoryId }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-lime">
      <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />
      {t.categories[category].label}
    </span>
  );
}
