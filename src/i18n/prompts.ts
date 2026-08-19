import dictionary from './dictionary.json';

export const LOCALES = ['en', 'bg', 'es', 'el', 'de', 'ro'] as const;
export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Record<string, string>;
export type WordPrompt = { category: string; exact: LocalizedText; hint: LocalizedText };
export type DrawingPrompt = { exact: LocalizedText; hint: LocalizedText };

export const WORD_PROMPTS = dictionary.prompts.words as WordPrompt[];
export const DRAWING_PROMPTS = dictionary.prompts.drawings as DrawingPrompt[];

/** Reads a localized value with an English fallback, so a gap never renders blank. */
export function localized(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? '';
}
