import words from './words.json';
import drawings from './drawings.json';

export const LOCALES = ['en', 'bg', 'es', 'el', 'de', 'ro', 'tr'] as const;
export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Record<string, string>;
export type WordPrompt = { category: string; exact: LocalizedText; hint: LocalizedText };
export type DrawingPrompt = { exact: LocalizedText; hint: LocalizedText };

/**
 * The prompt libraries live in their own files rather than inside
 * `dictionary.json`: they would bury the UI strings, and keeping them apart
 * means a translator can work on one without touching the other.
 * `dictionary.json` is UI copy only.
 *
 * `words.json` and `drawings.json` are generated, not hand-edited. The source
 * of truth is a spreadsheet of every prompt in every language, imported with
 * `npm run import:prompts -- <sheet.csv>`. `prompts-template.csv` in the repo
 * root has the column layout.
 *
 * Both libraries are currently empty, so the word and drawing modes cannot
 * deal a round until `prompts-src/` is populated and the build is run.
 */
export const WORD_PROMPTS = words as WordPrompt[];
export const DRAWING_PROMPTS = drawings as DrawingPrompt[];

/** Reads a localized value with an English fallback, so a gap never renders blank. */
export function localized(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? '';
}
