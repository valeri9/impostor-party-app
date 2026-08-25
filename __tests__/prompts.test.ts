import { LOCALES, PROMPTS } from '../src/i18n/prompts';

/**
 * The prompt library is large enough that a gap would never show up in a
 * play-through test — it would surface as a blank secret for one unlucky
 * player, in one language, on one round. These check the whole library.
 *
 * It is imported from a spreadsheet rather than hand-edited, so these assert
 * the properties every generated library must hold rather than a fixed count.
 */
describe('prompt library', () => {
  it('translates every secret and every hint into all seven languages', () => {
    const gaps: string[] = [];
    PROMPTS.forEach((prompt, i) => {
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
    const leaks = PROMPTS.filter((p) =>
      LOCALES.some((l) => p.exact[l]?.toLowerCase() === p.hint[l]?.toLowerCase()),
    ).map((p) => p.exact.en);
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
    const leaks = PROMPTS.filter((p) =>
      LOCALES.some((l) => [...words(p.exact[l] ?? '')].some((w) => words(p.hint[l] ?? '').has(w))),
    ).map((p) => p.exact.en);
    expect(leaks).toEqual([]);
  });

  it('has no duplicate entries', () => {
    const seen = new Set<string>();
    const duplicates = PROMPTS.map((p) => p.exact.en.toLowerCase().trim()).filter((key) =>
      seen.has(key) ? true : (seen.add(key), false),
    );
    expect(duplicates).toEqual([]);
  });
});
