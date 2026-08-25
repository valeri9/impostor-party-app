import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import dictionary from './dictionary.json';
import { LOCALES, type Locale } from './prompts';

export { LOCALES, localized, PROMPTS } from './prompts';
export type { Locale, LocalizedText, Prompt } from './prompts';

/** Native language names — deliberately not translated. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  bg: 'Български',
  es: 'Español',
  el: 'Ελληνικά',
  de: 'Deutsch',
  ro: 'Română',
  tr: 'Türkçe',
};

type UiStrings = Record<string, string>;
const UI = dictionary.ui as Record<string, UiStrings>;

const STORAGE_KEY = '@impostor_party/locale';

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Best-effort match of the device language, falling back to English. */
function detectDeviceLocale(): Locale {
  for (const l of getLocales()) {
    const code = l.languageCode?.toLowerCase();
    if (isLocale(code)) return code;
  }
  return 'en';
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const template = UI[locale]?.[key] ?? UI.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        // Storage is best-effort; fall through to device detection.
      }
      if (cancelled) return;
      setLocaleState(isLocale(stored) ? stored : detectDeviceLocale());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Persisting the choice is a convenience, not a requirement.
    });
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      ready,
    }),
    [locale, setLocale, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
