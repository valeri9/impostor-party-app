import { Platform } from 'react-native';

/**
 * Design tokens — Nintendo Game Boy (DMG-01) dot-matrix aesthetic.
 *
 * The original hardware could display exactly four shades of one olive green,
 * so that is the entire palette: no hues, no gradients, no soft shadows. Depth
 * comes from hard 1-bit borders and from *inverting* a block (ink fill, light
 * text) the way an 8-bit game highlighted a selected menu row.
 */

/** The four shades the DMG's LCD could actually show, darkest to lightest. */
export const LCD = {
  darkest: '#0f380f',
  dark: '#306230',
  light: '#8bac0f',
  lightest: '#9bbc0f',
} as const;

export const colors = {
  // Surfaces — the lit screen, and the one-shade-darker wells cut into it.
  bg: LCD.lightest,
  bgDeep: LCD.light,
  surface: LCD.light,

  // Text. Only two shades read cleanly on the screen green, so hierarchy is
  // carried by size, casing and letter-spacing rather than by more colours.
  ink: LCD.darkest,
  inkSoft: LCD.dark,
  /** Text drawn on top of an ink-filled block. */
  onInk: LCD.lightest,

  // The plastic around the screen, and the maroon wordmark printed on it.
  shell: '#2f3128',
  shellEdge: '#15160f',
  shellText: '#8c3d5b',

  // Drawing pens: all four shades. The one matching the canvas doubles as an
  // eraser, exactly as in the Game Boy Camera's paint tool.
  swatches: [LCD.darkest, LCD.light, LCD.dark, LCD.lightest],

  // Playing cards, printed in the same four shades.
  cardFace: LCD.lightest,
  cardRed: LCD.dark,
  cardBlack: LCD.darkest,
  cardBack: LCD.dark,
} as const;

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

export const type = {
  hero: { fontFamily: PIXEL_FONT, fontSize: 32, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontFamily: PIXEL_FONT, fontSize: 23, fontWeight: '700', letterSpacing: 1.2 },
  heading: { fontFamily: PIXEL_FONT, fontSize: 18, fontWeight: '700', letterSpacing: 0.8 },
  body: { fontFamily: PIXEL_FONT, fontSize: 15, fontWeight: '600', letterSpacing: 0.4 },
  label: { fontFamily: PIXEL_FONT, fontSize: 14, fontWeight: '700', letterSpacing: 0.8 },
  caption: { fontFamily: PIXEL_FONT, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
} as const;

/** Minimum touch target per Material / HIG guidance. */
export const HIT_SIZE = 52;

/**
 * Modes used to carry a hue each. A four-shade screen has none to spare, so
 * they all draw in ink and stay apart by name, glyph and layout instead.
 */
export const MODE_ACCENT = {
  word: colors.ink,
  canvas: colors.ink,
  timer: colors.ink,
  mafia: colors.ink,
} as const;

/** A tiny emblem per mode, in place of the colour coding. */
export const MODE_GLYPH = {
  word: '■',
  canvas: '✎',
  timer: '◷',
  mafia: '♠',
} as const;

/** Printed under the screen on a real DMG. */
export const BEZEL_CAPTION = 'DOT MATRIX WITH STEREO SOUND';
