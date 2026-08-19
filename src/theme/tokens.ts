/**
 * Design tokens — dark-mode-first party palette.
 * slate-900 base with indigo / emerald / rose accents.
 */

export const colors = {
  // Surfaces
  bg: '#0f172a', // slate-900
  bgDeep: '#020617', // slate-950
  surface: '#1e293b', // slate-800
  surfaceAlt: '#334155', // slate-700
  border: '#475569', // slate-600

  // Text
  text: '#f8fafc', // slate-50
  textMuted: '#94a3b8', // slate-400
  textFaint: '#64748b', // slate-500
  onAccent: '#ffffff',

  // Accents
  indigo: '#6366f1',
  indigoDark: '#4338ca',
  emerald: '#10b981',
  emeraldDark: '#047857',
  rose: '#f43f5e',
  roseDark: '#be123c',
  amber: '#f59e0b',

  // Drawing swatches (high contrast on dark canvas)
  swatches: ['#f8fafc', '#f43f5e', '#38bdf8', '#facc15', '#4ade80'],

  // Playing card
  cardFace: '#fdfcf7',
  cardRed: '#c0392b',
  cardBlack: '#1a1a1a',
  cardBackRed: '#a4243b',
  cardBackBlue: '#1e3a8a',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const type = {
  hero: { fontSize: 42, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 17, fontWeight: '500' },
  label: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '600' },
} as const;

/** Minimum touch target per Material / HIG guidance. */
export const HIT_SIZE = 52;

/** Each mode carries its own accent so screens are instantly recognizable. */
export const MODE_ACCENT = {
  word: colors.indigo,
  canvas: colors.emerald,
  timer: colors.amber,
  mafia: colors.rose,
} as const;
