import { getTopic } from '../data/topics';
import { useNow } from '../hooks/useNow';
import { useTabTitle, useTimerAlerts } from '../hooks/useTimerAlerts';
import { localize, useI18n } from '../i18n';
import { createTimer, deadline, formatClock, isExpired, isRunning, remainingMs } from '../lib/timer';
import type { AlertPrefs, ChallengeSession } from '../types';

const IDLE_TIMER = createTimer(1);

/**
 * Tab-title countdown plus chime/notification for the active session.
 * Mounted at the app level so alerts survive switching to Home or Progress
 * mid-challenge, not just while the timer screen is open.
 */
export function SessionAlerts({ session, alerts }: { session: ChallengeSession | null; alerts: AlertPrefs }) {
  const { t, locale } = useI18n();
  const phase = session?.phase;
  const timer = phase === 'research' ? session!.research : phase === 'explain' ? session!.explain : IDLE_TIMER;
  const now = useNow(isRunning(timer), deadline(timer));
  const topic = session ? getTopic(session.topicId) : undefined;

  useTimerAlerts({
    timer,
    ...alerts,
    title: phase === 'research' ? t.alerts.researchOverTitle : t.alerts.explainOverTitle,
    body:
      phase === 'research'
        ? t.alerts.researchOverBody(topic ? localize(topic.title, locale) : '')
        : t.alerts.explainOverBody,
  });

  const clock = formatClock(remainingMs(timer, now));
  const expired = isExpired(timer, now);
  let title: string | null = null;
  if (phase === 'research') {
    title = expired ? t.tabTitle.explainNow : isRunning(timer) ? t.tabTitle.running(clock, t.research.timerLabel) : t.tabTitle.paused(clock);
  } else if (phase === 'explain') {
    title = expired
      ? t.tabTitle.timesUp
      : !timer.started
        ? t.tabTitle.explainNow
        : isRunning(timer)
          ? t.tabTitle.running(clock, t.explain.timerLabel)
          : t.tabTitle.paused(clock);
  }
  useTabTitle(title);

  return null;
}
