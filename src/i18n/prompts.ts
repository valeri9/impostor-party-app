import words from './words.json';
import drawings from './drawings.json';

export const LOCALES = ['en', 'bg', 'es', 'el', 'de', 'ro'] as const;
export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Record<string, string>;
export type WordPrompt = { category: string; exact: LocalizedText; hint: LocalizedText };
export type DrawingPrompt = { exact: LocalizedText; hint: LocalizedText };

/**
 * The prompt libraries live in their own files rather than inside
 * `dictionary.json`: at 300 entries each they would bury the UI strings, and
 * keeping them apart means a translator can work on one without touching the
 * other. `dictionary.json` is now UI copy only.
 */
export const WORD_PROMPTS = words as WordPrompt[];
export const DRAWING_PROMPTS = drawings as DrawingPrompt[];

/** Reads a localized value with an English fallback, so a gap never renders blank. */
export function localized(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? '';
}
