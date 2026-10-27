import { useEffect, useState } from 'react';

/**
 * Current epoch ms, refreshed while `active`. The value is only used to read
 * timestamp-based timers, so a throttled background tab can't cause drift —
 * and we re-sync immediately when the tab becomes visible again.
 *
 * Background tabs may run the interval as rarely as once a minute, so an
 * optional `deadline` gets its own one-off timeout to land on time.
 */
export function useNow(active: boolean, deadline: number | null = null, intervalMs = 200): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const atDeadline = deadline === null ? undefined : window.setTimeout(tick, Math.max(0, deadline - Date.now()) + 20);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(atDeadline);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [active, deadline, intervalMs]);

  return now;
}
