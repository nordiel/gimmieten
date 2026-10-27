import { createContext, useContext, type ReactNode } from 'react';
import type { Locale, LocalizedText } from '../types';
import { en, type Messages } from './en';
import { es } from './es';

export type { Messages };

export const LOCALES: { id: Locale; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
];

export const MESSAGES: Record<Locale, Messages> = { en, es };

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'es';
}

/** First supported language from the browser's preferences, else English. */
export function detectLocale(): Locale {
  const preferred = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.en;
}

interface I18nValue {
  locale: Locale;
  t: Messages;
}

const I18nContext = createContext<I18nValue>({ locale: 'en', t: en });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: MESSAGES[locale] }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
