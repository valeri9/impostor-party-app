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
    lcd: {
      darkest: '#0f380f',
      dark: '#306230',
      light: '#8bac0f',
      lightest: '#9bbc0f',
    },
    shell: {
      body: '#c9cbc4',
      bodyEdge: '#a9aba3',
      bezel: '#5c5670',
      bezelEdge: '#443f54',
      caption: '#a9a5b5',
      stripeMagenta: '#a5195c',
      stripeNavy: '#252b6b',
      print: '#2b3087',
      printDeep: '#1c2066',
      button: '#b5185a',
      buttonDeep: '#8b1145',
      onButton: '#f4f1ea',
      led: '#7d1f1f',
    },
  },
  {
    id: 'neon-nebula',
    nameKey: 'skin.neonNebula.name',
    priceCents: 199,
    lcd: {
      darkest: '#1c0e33',
      dark: '#4b1f7a',
      light: '#a855e0',
      lightest: '#cfa3f7',
    },
    shell: {
      body: '#241b33',
      bodyEdge: '#150f1f',
      bezel: '#120a1e',
      bezelEdge: '#05030a',
      caption: '#a897c9',
      stripeMagenta: '#ff2e88',
      stripeNavy: '#00e5ff',
      print: '#00e5ff',
      printDeep: '#0899ab',
      button: '#ff2e88',
      buttonDeep: '#c4106a',
      onButton: '#fdf1ff',
      led: '#ff3b5c',
    },
  },
  {
    id: 'shoreline',
    nameKey: 'skin.shoreline.name',
    priceCents: 249,
    sceneId: 'shoreline',
    lcd: {
      darkest: '#0b3654',
      dark: '#1c6e8c',
      light: '#5cc8d1',
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
      print: '#ff8c42',
      printDeep: '#cc6a28',
      button: '#ff6b4a',
      buttonDeep: '#cc4f32',
      onButton: '#fff5e6',
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
