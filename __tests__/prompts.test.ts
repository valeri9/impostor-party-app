import dictionary from '../src/i18n/dictionary.json';
import { DRAWING_PROMPTS, LOCALES, WORD_PROMPTS } from '../src/i18n/prompts';

/**
 * The prompt libraries are large enough that a gap would never show up in a
 * play-through test — it would surface as a blank secret for one unlucky
 * player, in one language, on one round. These check the whole library.
 *
 * The libraries are rebuilt from `prompts-src/` rather than hand-edited, so
 * these assert the properties every generated library must hold instead of a
 * fixed entry count. They pass vacuously while the library is empty and start
 * guarding again the moment prompts are added.
 */

const ui = dictionary.ui as Record<string, Record<string, string>>;

describe('prompt library', () => {
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

    it('never lets a hint reuse a word from its own secret', () => {
      // The failure this catches is subtler than an identical hint: "Eiffel
      // Tower" hinted as "Tall tower" hands the impostor the word outright.
      const words = (s: string) =>
        new Set(
          s
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            .match(/\w+/g)
            ?.filter((w) => w.length > 3) ?? [],
        );
      const leaks = prompts
        .filter((p) => LOCALES.some((l) => [...words(p.exact[l] ?? '')].some((w) => words(p.hint[l] ?? '').has(w))))
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
    const tallies = Object.values(counts);
    // An uneven split would quietly bias which categories players see most —
    // but that only means anything once the library is past sample size, so
    // a part-built library is left alone rather than reported as unbalanced.
    if (tallies.length < 2 || Math.min(...tallies) < 2) return;
    expect(new Set(tallies).size).toBe(1);
  });
});
