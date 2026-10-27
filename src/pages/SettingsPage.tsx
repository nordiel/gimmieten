import { BellRing, Check, Languages, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Toggle } from '../components/Toggle';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LOCALES, useI18n } from '../i18n';
import { notificationPermission, playChime, requestNotifications, unlockAudio, type NotifyPermission } from '../lib/alerts';
import type { AlertPrefs, Locale } from '../types';

interface SettingsPageProps {
  alerts: AlertPrefs;
  onLocaleChange: (locale: Locale) => void;
  onAlertsChange: (patch: Partial<AlertPrefs>) => void;
}

export function SettingsPage({ alerts, onLocaleChange, onAlertsChange }: SettingsPageProps) {
  const { t, locale } = useI18n();
  const [permission, setPermission] = useState<NotifyPermission>(notificationPermission);

  const toggleNotify = async (on: boolean) => {
    if (!on) {
      onAlertsChange({ notify: false });
      return;
    }
    // Only ask for permission once the player opts in.
    const result = permission === 'granted' ? permission : await requestNotifications();
    setPermission(result);
    onAlertsChange({ notify: result === 'granted' });
  };

  return (
    <div className="space-y-12 pb-10">
      <header>
        <p className="eyebrow">{t.settings.eyebrow}</p>
        <h1 className="mt-3 text-5xl font-bold sm:text-6xl">{t.settings.heading}</h1>
      </header>

      <Card as="section" className="p-6 sm:p-8" aria-labelledby="language-heading">
        <div className="flex items-center gap-3">
          <Languages className="h-5 w-5 text-lime" aria-hidden="true" />
          <h2 id="language-heading" className="text-2xl font-bold">
            {t.settings.language}
          </h2>
        </div>
        <p className="mt-1 text-sm text-mute">{t.settings.languageHelp}</p>

        <div role="radiogroup" aria-labelledby="language-heading" className="mt-6 grid gap-3 sm:grid-cols-2">
          {LOCALES.map(({ id, name }) => {
            const selected = id === locale;
            return (
              <label
                key={id}
                lang={id}
                className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lime has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-ink ${
                  selected ? 'border-lime bg-lime/10 text-lime' : 'border-ink-500 bg-ink-700 text-bone hover:border-lime/50'
                }`}
              >
                <input
                  type="radio"
                  name="locale"
                  value={id}
                  checked={selected}
                  onChange={() => onLocaleChange(id)}
                  className="sr-only"
                />
                <span className="font-display text-lg font-bold">{name}</span>
                {selected && <Check className="h-5 w-5" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
      </Card>

      <Card as="section" className="p-6 sm:p-8" aria-labelledby="alerts-heading">
        <div className="flex items-center gap-3">
          <BellRing className="h-5 w-5 text-lime" aria-hidden="true" />
          <h2 id="alerts-heading" className="text-2xl font-bold">
            {t.settings.alerts}
          </h2>
        </div>
        <p className="mt-1 text-sm text-mute">{t.settings.alertsHelp}</p>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <Toggle
              label={t.settings.sound}
              description={t.settings.soundHelp}
              checked={alerts.sound}
              onChange={(sound) => {
                if (sound) unlockAudio();
                onAlertsChange({ sound });
              }}
            />
            <Button variant="secondary" size="sm" onClick={playChime} icon={<Volume2 className="h-4 w-4" aria-hidden="true" />}>
              {t.settings.testSound}
            </Button>
          </div>

          <div className="border-t border-ink-600 pt-6">
            <Toggle
              label={t.settings.notify}
              description={
                permission === 'unsupported'
                  ? t.settings.notifyUnsupported
                  : permission === 'denied'
                    ? <span className="text-alert">{t.settings.notifyBlocked}</span>
                    : t.settings.notifyHelp
              }
              checked={alerts.notify && permission === 'granted'}
              onChange={(on) => void toggleNotify(on)}
              disabled={permission === 'unsupported'}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
