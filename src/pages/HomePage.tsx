import { ArrowRight, BookOpen, Flame, Hand, Layers, Mic, PartyPopper, Search, Shuffle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ConfirmInline } from '../components/ConfirmInline';
import { StatTile } from '../components/StatTile';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CATEGORIES, TOPICS, getTopic, topicCount } from '../data/topics';
import type { ProgressStats } from '../hooks/useGameState';
import { localize, useI18n } from '../i18n';
import type { CategoryId, ChallengeSession, HistoryEntry } from '../types';

interface HomePageProps {
  session: ChallengeSession | null;
  stats: ProgressStats;
  recent: HistoryEntry[];
  category: CategoryId | 'all';
  onCategoryChange: (category: CategoryId | 'all') => void;
  onStart: () => void;
  onResume: () => void;
  onAbandon: () => void;
  onOpenProgress: () => void;
  onParty: () => void;
}

const STEP_ICONS = [Shuffle, Search, Mic, Sparkles];

export function HomePage({
  session,
  stats,
  recent,
  category,
  onCategoryChange,
  onStart,
  onResume,
  onAbandon,
  onOpenProgress,
  onParty,
}: HomePageProps) {
  const { t, locale } = useI18n();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const activeTopic = session ? getTopic(session.topicId) : undefined;
  const hasActive = Boolean(session && activeTopic && session.savedAt === null);
  const last = recent[0];
  const lastTopic = last ? getTopic(last.topicId) : undefined;

  return (
    <div className="space-y-20 pb-10">
      {/* Hero */}
      <section className="animate-fade-up pt-6 text-center sm:pt-14">
        <p className="eyebrow">{t.home.eyebrow}</p>
        <h1 className="mx-auto mt-6 max-w-4xl text-balance text-5xl font-bold leading-[0.95] sm:text-7xl md:text-8xl">
          {t.home.heroLine1}
          <br />
          <span className="text-lime">{t.home.heroLine2}</span>
        </h1>

        {hasActive && session && activeTopic ? (
          <div className="mx-auto mt-12 max-w-xl space-y-3">
            <Card glow className="p-5 text-left">
              <p className="eyebrow text-lime">{t.home.activePhase[session.phase]}</p>
              <p className="mt-2 font-display text-2xl font-bold">{localize(activeTopic.title, locale)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={onResume} iconRight={<ArrowRight className="h-4 w-4" />}>
                  {t.home.resume}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmAbandon(true)}>
                  {t.home.abandon}
                </Button>
              </div>
            </Card>
            {confirmAbandon && (
              <ConfirmInline
                message={t.home.abandonConfirm}
                confirmLabel={t.home.abandon}
                onConfirm={() => {
                  setConfirmAbandon(false);
                  onAbandon();
                }}
                onCancel={() => setConfirmAbandon(false)}
              />
            )}
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center gap-4">
            <Button
              size="xl"
              onClick={onStart}
              icon={<Hand className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />}
              className="w-full max-w-sm sm:w-auto"
            >
              {t.home.cta}
            </Button>
            <p className="text-sm text-mute">
              {category === 'all'
                ? t.home.poolAll(TOPICS.length, CATEGORIES.length)
                : t.home.poolOne(t.categories[category].label)}
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-col items-center gap-1">
          <Button variant="ghost" onClick={onParty} icon={<PartyPopper className="h-4 w-4" aria-hidden="true" />}>
            {t.party.entry}
          </Button>
          <p className="text-xs text-mute">{t.party.entryHelp}</p>
        </div>
      </section>

      {/* Progress summary */}
      <section aria-labelledby="progress-heading">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="progress-heading" className="eyebrow">
            {t.home.progressHeading}
          </h2>
          <button
            type="button"
            onClick={onOpenProgress}
            className="rounded font-mono text-xs uppercase tracking-[0.15em] text-mute transition-colors hover:text-lime"
          >
            {t.home.viewHistory}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            icon={<Flame className="h-4 w-4" aria-hidden="true" />}
            label={t.home.statStreak}
            value={
              <>
                {stats.currentStreak}
                <span className="ml-1 text-base font-medium text-mute">{t.common.days(stats.currentStreak)}</span>
              </>
            }
            accent={stats.currentStreak > 0}
          />
          <StatTile icon={<Layers className="h-4 w-4" aria-hidden="true" />} label={t.home.statCompleted} value={stats.completed} />
          <StatTile icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} label={t.home.statTopics} value={stats.topicsExplored} />
        </div>
        {stats.completed === 0 ? (
          <p className="mt-4 text-sm text-mute">{t.home.empty}</p>
        ) : (
          <p className="mt-4 text-sm text-mute">
            {stats.completedToday ? t.home.doneToday : stats.currentStreak > 0 ? t.home.keepStreak : t.home.newStreak}
            {last && (
              <>
                {' '}
                {t.home.last}{' '}
                <span className="text-bone">{lastTopic ? localize(lastTopic.title, locale) : last.topicTitle}</span> ·{' '}
                {last.score}%
              </>
            )}
          </p>
        )}
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="eyebrow mb-4">
          {t.home.howHeading}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.steps.map(({ title, body }, i) => {
            const Icon = STEP_ICONS[i] ?? Sparkles;
            return (
              <Card as="li" key={title} className="p-5">
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-lime" aria-hidden="true" />
                  <span className="font-mono text-xs text-mute">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold">{title}</h3>
                <p className="mt-1 text-sm text-mute">{body}</p>
              </Card>
            );
          })}
        </ol>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="categories-heading" className="eyebrow">
            {t.home.poolHeading}
          </h2>
          <span className="text-xs text-mute">{t.home.poolHelp}</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="categories-heading">
          <CategoryChip label={t.home.everything} count={TOPICS.length} selected={category === 'all'} onClick={() => onCategoryChange('all')} />
          {CATEGORIES.map((id) => (
            <CategoryChip
              key={id}
              label={t.categories[id].label}
              count={topicCount(id)}
              selected={category === id}
              onClick={() => onCategoryChange(id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface CategoryChipProps {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}

function CategoryChip({ label, count, selected, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95 ${
        selected
          ? 'border-lime bg-lime text-ink'
          : 'border-ink-500 bg-ink-800 text-bone hover:border-lime/60 hover:text-lime'
      }`}
    >
      {label}
      <span className={`font-mono text-xs ${selected ? 'text-ink/60' : 'text-mute'}`}>{count}</span>
    </button>
  );
}
