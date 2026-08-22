#!/usr/bin/env node
/**
 * WCAG relative-luminance contrast ratio between two hex colours — for
 * sanity-checking theme/skin colour pairs (see src/theme/skins.ts) without
 * re-deriving the formula by hand each time.
 *
 *   node scripts/contrast-ratio.js "#233b16" "#a5c695"
 *   node scripts/contrast-ratio.js "#233b16" "#a5c695" "#87a578" "#3d572f"  (pairs, in order)
 */
function luminance(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [rl, gl, bl] = [r, g, b].map(f);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrast(hexA, hexB) {
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2 !== 0) {
  console.error('Usage: node scripts/contrast-ratio.js <hex1> <hex2> [<hex3> <hex4> ...]');
  process.exit(1);
}

for (let i = 0; i < args.length; i += 2) {
  const [a, b] = [args[i], args[i + 1]];
  const ratio = contrast(a, b);
  const grade = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA-large only' : 'fail';
  console.log(`${a} vs ${b}: ${ratio.toFixed(2)}:1  (${grade})`);
}
