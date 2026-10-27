import type { ReactNode } from 'react';
import { localize, useI18n } from '../i18n';
import type { Topic } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { Card } from './ui/Card';

interface ChallengeCardProps {
  topic: Topic;
  showHint?: boolean;
  children?: ReactNode;
  /** Changing this replays the entrance animation (e.g. after a skip). */
  animationKey?: string;
}

export function ChallengeCard({ topic, showHint = true, children, animationKey }: ChallengeCardProps) {
  const { locale } = useI18n();
  return (
    <Card glow className="p-6 sm:p-10">
      <div key={animationKey ?? topic.id} className="animate-fade-up">
        <CategoryBadge category={topic.category} />
        <h2 className="mt-5 text-balance text-4xl font-bold leading-[1.05] text-bone sm:text-6xl">
          {localize(topic.title, locale)}
        </h2>
        {showHint && topic.hint && <p className="mt-4 max-w-xl text-lg text-mute">{localize(topic.hint, locale)}</p>}
      </div>
      {children}
    </Card>
  );
}
