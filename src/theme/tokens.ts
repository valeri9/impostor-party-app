import { Platform } from 'react-native';

import { DEFAULT_SKIN_ID, findSkin, type Skin } from './skins';

/**
 * Design tokens — Nintendo Game Boy (DMG-01) aesthetic, in two halves.
 *
 * Inside the screen it is still 1-bit: the LCD could display exactly four
 * shades of one olive green, so game content uses no hues, no gradients and no
 * soft shadows — depth comes from hard borders and from *inverting* a block
 * (ink fill, light text) the way an 8-bit game highlighted a menu row.
 *
 * The console around it is where the colour lives: grey plastic, the purple
 * screen bezel with its magenta and navy pinstripes, the navy print, and the
 * crimson A/B buttons. The rule is simply where a thing belongs — content is
 * on the screen, controls are on the shell.
 *
 * The actual palette values live in ./skins.ts — this file's LCD/SHELL/colors
 * exports are the default skin, kept as static exports because most of the
 * app still reads them directly. useSkinTokens() in ./SkinContext resolves
 * the *active* skin the same way, for the parts of the app that skin-switch.
 */

const DEFAULT_SKIN = findSkin(DEFAULT_SKIN_ID);

/** The four shades the DMG's LCD could actually show, darkest to lightest. */
export const LCD = DEFAULT_SKIN.lcd;

/** The plastic, print and buttons of the console itself. */
export const SHELL = DEFAULT_SKIN.shell;

/** Derives the screen-content colour set from a skin. */
export function deriveColors(skin: Skin) {
  const { lcd } = skin;
  return {
    // Surfaces — the lit screen, and the one-shade-darker wells cut into it.
    bg: lcd.lightest,
    bgDeep: lcd.light,
    // Cards/inputs/pills: `containerFill`/`onContainer` let a skin override
    // this pairing (DMG Classic and Neon Nebula cut the well a shade deeper
    // than `light` and flip its text light, since darkest-on-light only
    // just cleared 4.5:1 there and read as flat on a narrow, muddy palette).
    // Undefined on a skin falls back to the original light-well/dark-ink pair.
    surface: skin.containerFill ?? lcd.light,
    /** Text/border/icon colour for content drawn on `surface`. */
    onSurface: skin.onContainer ?? lcd.darkest,

    // Text. Only two shades read cleanly on the screen green, so hierarchy is
    // carried by size, casing and letter-spacing rather than by more colours.
    ink: lcd.darkest,
    inkSoft: lcd.dark,
    /** Text drawn on top of an ink-filled block. */
    onInk: lcd.lightest,

    // Drawing pens: all four shades. The one matching the canvas doubles as an
    // eraser, exactly as in the Game Boy Camera's paint tool.
    swatches: [lcd.darkest, lcd.light, lcd.dark, lcd.lightest],

    // Playing cards, printed in the same four shades.
    cardFace: lcd.lightest,
    cardRed: lcd.dark,
    cardBlack: lcd.darkest,
    cardBack: lcd.dark,
  } as const;
}

export const colors = deriveColors(DEFAULT_SKIN);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * 1-bit borders: everything is outlined, nothing is shaded. There is no radii
 * scale — the dot-matrix screen had square pixels, so nothing is rounded.
 */
export const stroke = {
  hair: 2,
  thin: 3,
  thick: 4,
} as const;

/**
 * A blocky monospace face, the closest stand-in for a bitmap font that is
 * guaranteed present on Android, iOS and web without shipping a font file.
 */
export const PIXEL_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'Menlo, Consolas, "Courier New", monospace',
}) as string;

/**
 * None of these set a lineHeight tighter than its fontSize needs — without
 * one, Android in particular boxes each line to the font's raw ascent, which
 * clips descenders (the tail of a "y", the bottom of a "p") right off, worst
 * of all on numberOfLines={1} + adjustsFontSizeToFit text like the title.
 */
export const type = {
  hero: { fontFamily: PIXEL_FONT, fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontFamily: PIXEL_FONT, fontSize: 23, lineHeight: 29, fontWeight: '700', letterSpacing: 1.2 },
  heading: { fontFamily: PIXEL_FONT, fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: 0.8 },
  body: { fontFamily: PIXEL_FONT, fontSize: 15, lineHeight: 19, fontWeight: '600', letterSpacing: 0.4 },
  label: { fontFamily: PIXEL_FONT, fontSize: 14, lineHeight: 18, fontWeight: '700', letterSpacing: 0.8 },
  caption: { fontFamily: PIXEL_FONT, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1 },
} as const;

/** Minimum touch target per Material / HIG guidance. */
export const HIT_SIZE = 52;

/** A tiny emblem per mode, in place of the colour coding a four-shade
 *  screen has no hue left to spare for — modes stay apart by name, glyph
 *  and layout instead. Every mode's accent is just the active skin's own
 *  ink colour (via useSkinTokens), so there is no separate per-mode token. */
export const MODE_GLYPH = {
  word: '■',
  canvas: '✎',
  timer: '◷',
  mafia: '♠',
} as const;

/**
 * The bezel caption — an original in-universe brand line, not the real
 * DMG's printed wording (lifting that exact text would be a much closer
 * copy than any shape or colour choice elsewhere in this skin).
 */
export const BEZEL_CAPTION = 'PASS & PLAY PARTY SYSTEM';
