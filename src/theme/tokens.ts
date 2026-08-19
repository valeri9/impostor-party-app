import { Platform } from 'react-native';

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
 */

/** The four shades the DMG's LCD could actually show, darkest to lightest. */
export const LCD = {
  darkest: '#0f380f',
  dark: '#306230',
  light: '#8bac0f',
  lightest: '#9bbc0f',
} as const;

/** The plastic, print and buttons of the console itself. */
export const SHELL = {
  body: '#c9cbc4',
  bodyEdge: '#a9aba3',
  /** The dark panel the screen is set into. */
  bezel: '#5c5670',
  bezelEdge: '#443f54',
  /** The grey caption printed across the bezel. */
  caption: '#a9a5b5',
  /** The pinstripes either side of that caption. */
  stripeMagenta: '#a5195c',
  stripeNavy: '#252b6b',
  /** The navy the wordmark and button labels are printed in. */
  print: '#2b3087',
  printDeep: '#1c2066',
  /** The A and B buttons. */
  button: '#b5185a',
  buttonDeep: '#8b1145',
  onButton: '#f4f1ea',
  /** The battery indicator beside the screen. */
  led: '#7d1f1f',
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
