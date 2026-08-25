import prompts from './prompts.json';

export const LOCALES = ['en', 'bg', 'es', 'el', 'de', 'ro', 'tr'] as const;
export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Record<string, string>;
export type Prompt = { exact: LocalizedText; hint: LocalizedText };

/**
 * The prompt library lives in its own file rather than inside
 * `dictionary.json`: it would bury the UI strings, and keeping them apart
 * means a translator can work on one without touching the other.
 * `dictionary.json` is UI copy only.
 *
 * `prompts.json` is generated, not hand-edited. The source of truth is a
 * spreadsheet of every prompt in every language, imported with
 * `npm run import:prompts -- <sheet.xlsx>`.
 *
 * One library serves both modes: the word round says the secret, the drawing
 * round draws it. Splitting them would only create two lists to keep in step.
 */
export const PROMPTS = prompts as Prompt[];

/** Reads a localized value with an English fallback, so a gap never renders blank. */
export function localized(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? '';
}
