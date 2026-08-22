/**
 * The catalogue of console skins. Each skin is a full LCD + SHELL palette —
 * the same shape tokens.ts used to hardcode — so switching skins is just
 * switching which entry here is active, nothing more.
 */

export type LcdPalette = {
  darkest: string;
  dark: string;
  light: string;
  lightest: string;
};

export type ShellPalette = {
  body: string;
  bodyEdge: string;
  bezel: string;
  bezelEdge: string;
  caption: string;
  stripeMagenta: string;
  stripeNavy: string;
  print: string;
  printDeep: string;
  button: string;
  buttonDeep: string;
  onButton: string;
  /** Text/icon colour for content drawn on the `print`/`printDeep` fill
   *  (the danger button, and a ghost button once pressed). Kept apart from
   *  `onButton` because Neon Nebula's button fill went light while its print
   *  fill stayed dark — one skin can't share a single "on-fill" colour once
   *  its two fills sit at opposite ends of the lightness scale. */
  onPrint: string;
  /** Text colour for content printed straight onto the shell plastic (the
   *  wordmark under the screen, the skin-catalogue header) — `body`, not the
   *  LCD. Kept apart from `print` because `print` also has to read against
   *  the lit screen, which is the opposite brightness of the shell in a
   *  dark-bodied skin like Neon Nebula. */
  onShell: string;
  led: string;
};

export type Skin = {
  id: string;
  /** i18n key for the skin's display name, e.g. "skin.dmgClassic.name". */
  nameKey: string;
  /** Price in euro cents. 0 = free — every player owns it from install. */
  priceCents: number;
  lcd: LcdPalette;
  shell: ShellPalette;
  /** An animated banner this skin shows above the title on setup, in place
   *  of the plain title plate. Only one exists today (BeachScene, for
   *  'shoreline') — an id rather than a boolean so more can be added later
   *  without every skin needing an opinion on it. */
  sceneId?: 'shoreline';
};

/** The original palette, unlocked for everyone and always active by default. */
export const DEFAULT_SKIN_ID = 'dmg-classic';

export const SKINS: Skin[] = [
  {
    id: DEFAULT_SKIN_ID,
    nameKey: 'skin.dmgClassic.name',
    priceCents: 0,
    // The original hardware value (#9bbc0f) was the actual DMG-01's reflective,
    // non-backlit screen tint — accurate to the console, but a flat 85%-saturated
    // yellow-green filling a bright emissive phone screen is a very different,
    // much harsher thing to stare at than the dim reflective LCD it's quoting.
    // Same hue, same four-shade structure, saturation cut roughly in a third.
    // `light` pushed dark a second time below — it backs every card and text
    // input's fill (see deriveColors' `surface`), and the ink text drawn on
    // top of it only cleared ~2.8:1 contrast, well under the 4.5:1 a normal
    // reading pass needs. There isn't room to fix that *and* keep `light`
    // clearly apart from the screen background in this hue's narrow overall
    // range (ink-vs-background is only 6.5:1 to begin with) — the border
    // every surface already carries is what marks its edge, so legible
    // fill text won by design, not by accident.
    lcd: {
      darkest: '#233b16',
      dark: '#3d572f',
      light: '#87a578',
      lightest: '#a5c695',
    },
    shell: {
      body: '#c9cbc4',
      bodyEdge: '#a9aba3',
      bezel: '#5c5670',
      bezelEdge: '#443f54',
      caption: '#a9a5b5',
      stripeMagenta: '#a5195c',
      stripeNavy: '#252b6b',
      // button/buttonDeep deepened from the original #b5185a/#8b1145 — against
      // the softened screen background above, the original crimson no longer
      // stood out enough to read as a distinct, tappable control.
      print: '#2b3087',
      printDeep: '#1c2066',
      button: '#9a144d',
      buttonDeep: '#6f0e37',
      onButton: '#f4f1ea',
      onPrint: '#f4f1ea',
      onShell: '#2b3087',
      led: '#7d1f1f',
    },
  },
  {
    id: 'neon-nebula',
    nameKey: 'skin.neonNebula.name',
    priceCents: 199,
    // Same softening as DMG Classic: the background carried real saturation
    // (84%) at a lightness the eye already reads as bright — cut it roughly
    // in half so the screen reads as a calm lavender instead of a vivid one.
    // `light` pushed dark a second time below, same reasoning as DMG Classic.
    lcd: {
      darkest: '#1b1230',
      dark: '#3f3553',
      light: '#867b99',
      lightest: '#d0c1e1',
    },
    shell: {
      body: '#241b33',
      bodyEdge: '#150f1f',
      bezel: '#120a1e',
      bezelEdge: '#05030a',
      caption: '#a897c9',
      stripeMagenta: '#ff2e88',
      stripeNavy: '#00e5ff',
      // print unchanged from the previous pass — it still only has to read
      // against the lit screen (5:1), which it does.
      print: '#00555e',
      printDeep: '#001214',
      // button/buttonDeep/onButton flipped to a plain white-on-black pairing:
      // the deepened magenta from the previous pass fixed its contrast on the
      // screen but still all but disappeared against this skin's near-black
      // body and bezel (as low as 1.2:1) — everywhere the console shell shows
      // through, not just the screen, needed solving at once. Border colour
      // (buttonDeep) is a mid purple rather than black so a pressed button
      // still reads as a *pressed* state, not just gone.
      button: '#f4f0fb',
      buttonDeep: '#4a3d63',
      onButton: '#140c1e',
      // onPrint keeps the previous onButton value — the danger button's fill
      // is still the dark teal `print`, so its label still wants light text.
      onPrint: '#fdf1ff',
      // The wordmark and skin-catalogue header print straight onto `body`/
      // `bezel`, both near-black here — needs a colour of its own since
      // `print` (tuned for the light screen) reads at under 2:1 on either.
      onShell: '#c9baf0',
      led: '#ff3b5c',
    },
  },
  {
    id: 'shoreline',
    nameKey: 'skin.shoreline.name',
    priceCents: 249,
    sceneId: 'shoreline',
    // `light` pushed dark a second time below, same reasoning as the other
    // two skins — it backs every card and text input's fill, and ink text
    // on it was only clearing ~3.8:1, short of a comfortable reading contrast.
    lcd: {
      darkest: '#0b3654',
      dark: '#325c72',
      light: '#7da0aa',
      lightest: '#cdf2ea',
    },
    shell: {
      body: '#f2dfb8',
      bodyEdge: '#d8bd85',
      bezel: '#2f7a9e',
      bezelEdge: '#1f5a76',
      caption: '#eaf6fb',
      stripeMagenta: '#ff7a5c',
      stripeNavy: '#2a9d8f',
      // button unchanged — it already reads fine everywhere it's used.
      // print/printDeep lightened from #a84200/#5b2400 to a brighter tangerine:
      // the wordmark and ghost/danger text still needed to clear the mint
      // screen and the tan shell, so this stops short of a pale "light"
      // orange, which would have read fine on the dark bezel but vanished
      // into both of those lighter surfaces instead.
      print: '#b34e00',
      printDeep: '#7a3500',
      button: '#d62700',
      buttonDeep: '#8b1900',
      onButton: '#fff5e6',
      onPrint: '#fff5e6',
      onShell: '#b34e00',
      led: '#ff5252',
    },
  },
];

export function findSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function isFree(skin: Skin): boolean {
  return skin.priceCents === 0;
}
