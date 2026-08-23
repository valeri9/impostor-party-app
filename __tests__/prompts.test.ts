import dictionary from '../src/i18n/dictionary.json';
import { DRAWING_PROMPTS, LOCALES, WORD_PROMPTS } from '../src/i18n/prompts';

/**
 * The prompt libraries are large enough that a gap would never show up in a
 * play-through test — it would surface as a blank secret for one unlucky
 * player, in one language, on one round. These check the whole library.
 */

const ui = dictionary.ui as Record<string, Record<string, string>>;

describe('prompt library', () => {
  it('ships 300 words and 300 drawings', () => {
    expect(WORD_PROMPTS).toHaveLength(300);
    expect(DRAWING_PROMPTS).toHaveLength(300);
  });

  describe.each([
    ['words', WORD_PROMPTS],
    ['drawings', DRAWING_PROMPTS],
  ])('%s', (_name, prompts: ReadonlyArray<{ exact: Record<string, string>; hint: Record<string, string> }>) => {
    it('translates every secret and every hint into all seven languages', () => {
      const gaps: string[] = [];
      prompts.forEach((prompt, i) => {
        for (const field of ['exact', 'hint'] as const) {
          for (const locale of LOCALES) {
            const value = prompt[field][locale];
            if (typeof value !== 'string' || value.trim() === '') {
              gaps.push(`#${i} (${prompt.exact.en}) ${field}.${locale}`);
            }
          }
        }
      });
      expect(gaps).toEqual([]);
    });

    it('never gives the impostor a hint identical to the secret', () => {
      const leaks = prompts
        .filter((p) => LOCALES.some((l) => p.exact[l]?.toLowerCase() === p.hint[l]?.toLowerCase()))
        .map((p) => p.exact.en);
      expect(leaks).toEqual([]);
    });

    it('has no duplicate entries', () => {
      const seen = new Set<string>();
      const duplicates = prompts
        .map((p) => p.exact.en.toLowerCase().trim())
        .filter((key) => (seen.has(key) ? true : (seen.add(key), false)));
      expect(duplicates).toEqual([]);
    });
  });

  it('has a translated label for every word category', () => {
    const categories = [...new Set(WORD_PROMPTS.map((p) => p.category))];
    expect(categories.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const category of categories) {
      for (const locale of LOCALES) {
        if (!ui[locale]?.[`category.${category}`]) missing.push(`${locale}:category.${category}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('spreads the words evenly across the categories', () => {
    const counts = WORD_PROMPTS.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
    // An uneven split would quietly bias which categories players see most.
    expect(new Set(Object.values(counts)).size).toBe(1);
  });
});
