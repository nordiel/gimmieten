import { useEffect, useRef } from 'react';
import { scheduleChime, playChime, setTabTitle, showNotification } from '../lib/alerts';
import { deadline } from '../lib/timer';
import type { TimerState } from '../types';

interface TimerAlertOptions {
  timer: TimerState;
  sound: boolean;
  notify: boolean;
  /** Notification text, read when the alert fires. */
  title: string;
  body: string;
}

/**
 * Chime and (if the tab is hidden) notify when a running timer reaches zero.
 * Pausing or finishing early cancels the alert; deadlines that passed while
 * the page was closed stay silent.
 */
export function useTimerAlerts({ timer, sound, notify, title, body }: TimerAlertOptions): void {
  const text = useRef({ title, body });
  text.current = { title, body };
  const endAt = deadline(timer);

  useEffect(() => {
    if (endAt === null || endAt <= Date.now()) return;
    const cancelChime = sound ? scheduleChime(endAt) : null;
    const id = window.setTimeout(() => {
      // Audio wasn't unlocked when we scheduled (e.g. after a refresh): try now.
      if (sound && !cancelChime) playChime();
      if (notify && document.hidden) showNotification(text.current.title, text.current.body);
    }, endAt - Date.now());

    return () => {
      // Reaching the deadline also ends this phase and runs this cleanup, so
      // only cancel when we're clearly before it (a pause or early finish).
      if (Date.now() < endAt - 250) {
        cancelChime?.();
        window.clearTimeout(id);
      }
    };
  }, [endAt, sound, notify]);
}

/** Show `title` in the browser tab while the calling component is mounted. */
export function useTabTitle(title: string | null): void {
  useEffect(() => {
    setTabTitle(title);
    return () => setTabTitle(null);
  }, [title]);
}
