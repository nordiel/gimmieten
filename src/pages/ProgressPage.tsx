import { BookOpen, Flame, Gauge, Hand, Layers, Trash2, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmInline } from '../components/ConfirmInline';
import { StatTile } from '../components/StatTile';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { getTopic } from '../data/topics';
import type { ProgressStats } from '../hooks/useGameState';
import { localize, useI18n } from '../i18n';
import type { HistoryEntry } from '../types';

interface ProgressPageProps {
  stats: ProgressStats;
  history: HistoryEntry[];
  onStart: () => void;
  onReset: () => void;
}

const PAGE_SIZE = 15;

export function ProgressPage({ stats, history, onStart, onReset }: ProgressPageProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [confirmReset, setConfirmReset] = useState(false);
  const newestFirst = [...history].reverse();

  return (
    <div className="space-y-12 pb-10">
      <header>
        <p className="eyebrow">{t.progress.eyebrow}</p>
        <h1 className="mt-3 text-5xl font-bold sm:text-6xl">{t.progress.heading}</h1>
      </header>

      <section aria-label={t.progress.stats} className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile icon={<Flame className="h-4 w-4" aria-hidden="true" />} label={t.progress.streak} value={stats.currentStreak} accent={stats.currentStreak > 0} />
        <StatTile icon={<Trophy className="h-4 w-4" aria-hidden="true" />} label={t.progress.bestStreak} value={stats.longestStreak} />
        <StatTile icon={<Layers className="h-4 w-4" aria-hidden="true" />} label={t.progress.completed} value={stats.completed} />
        <StatTile icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} label={t.progress.topics} value={stats.topicsExplored} />
        <div className="col-span-2 md:col-span-1">
          <StatTile
            icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
            label={t.progress.avgScore}
            value={stats.averageScore === null ? '—' : `${stats.averageScore}%`}
          />
        </div>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="eyebrow mb-4">
          {t.progress.recent}
        </h2>

        {newestFirst.length === 0 ? (
          <Card className="flex flex-col items-center px-6 py-14 text-center">
            <Hand className="h-10 w-10 text-lime" aria-hidden="true" />
            <p className="mt-4 font-display text-2xl font-bold">{t.progress.emptyTitle}</p>
            <p className="mt-2 max-w-sm text-mute">{t.progress.emptyBody}</p>
            <Button className="mt-6" onClick={onStart}>
              {t.progress.emptyCta}
            </Button>
          </Card>
        ) : (
          <>
            <ul className="space-y-2">
              {newestFirst.slice(0, visible).map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </ul>
            {visible < newestFirst.length && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  {t.progress.showMore(newestFirst.length - visible)}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-3 border-t border-ink-600 pt-8">
          {confirmReset ? (
            <ConfirmInline
              message={t.progress.resetConfirm}
              confirmLabel={t.progress.resetConfirmButton}
              onConfirm={() => {
                setConfirmReset(false);
                onReset();
              }}
              onCancel={() => setConfirmReset(false)}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              {t.progress.reset}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const { t, locale } = useI18n();
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
    [locale],
  );
  const topic = getTopic(entry.topicId);
  return (
    <Card as="li" className="flex items-center gap-4 p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-bold">{topic ? localize(topic.title, locale) : entry.topicTitle}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-mute">
          {t.categories[entry.category].short} · {dateFormat.format(new Date(entry.completedAt))} · {t.common.minShort(entry.explainMinutes)}
        </p>
      </div>
      <div className="w-24 shrink-0 text-right sm:w-36">
        <p className="tabular font-display text-2xl font-bold text-lime">{entry.score}%</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden="true">
          <div className="h-full rounded-full bg-lime" style={{ width: `${entry.score}%` }} />
        </div>
      </div>
    </Card>
  );
}
