// Browser side effects for "time's up": a synthesized chime, OS notifications, and the tab title.

type AudioContextCtor = typeof AudioContext;

let audio: AudioContext | null = null;

function getAudio(): AudioContext | null {
  if (audio) return audio;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audio = new Ctor();
  } catch {
    return null;
  }
  return audio;
}

/** Browsers only allow sound after a user gesture, so call this from click handlers. */
export function unlockAudio(): void {
  const ctx = getAudio();
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
}

// A rising three-note "ding-ding-ding": [frequency Hz, offset s].
const NOTES: [number, number][] = [
  [660, 0],
  [880, 0.16],
  [1320, 0.32],
];

/**
 * Schedule the chime on the audio clock, which keeps accurate time in
 * background tabs where JS timers get throttled. Returns a cancel function,
 * or null if audio isn't unlocked yet (the caller should fall back).
 */
export function scheduleChime(atMs: number): (() => void) | null {
  const ctx = getAudio();
  if (!ctx || ctx.state !== 'running') return null;
  const startAt = ctx.currentTime + Math.max(0, (atMs - Date.now()) / 1000);
  const oscillators = NOTES.map(([frequency, offset]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = startAt + offset;
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
    return osc;
  });
  return () => {
    for (const osc of oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped.
      }
    }
  };
}

export function playChime(): void {
  unlockAudio();
  scheduleChime(Date.now());
}

// ---------- Notifications ----------

export type NotifyPermission = NotificationPermission | 'unsupported';

export function notificationPermission(): NotifyPermission {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

export async function requestNotifications(): Promise<NotifyPermission> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showNotification(title: string, body: string): void {
  if (notificationPermission() !== 'granted') return;
  try {
    const n = new Notification(title, { body, icon: '/favicon.svg', tag: 'gimmiefive-timer' });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}

// ---------- Tab title ----------

let baseTitle = typeof document === 'undefined' ? '' : document.title;
let overrideTitle: string | null = null;

function applyTitle() {
  document.title = overrideTitle ?? baseTitle;
}

/** The normal page title (set by the app per language). */
export function setBaseTitle(title: string): void {
  baseTitle = title;
  applyTitle();
}

/** A temporary title such as a live countdown; null restores the base title. */
export function setTabTitle(title: string | null): void {
  overrideTitle = title;
  applyTitle();
}
