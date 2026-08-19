import React from 'react';
import Svg, { Rect } from 'react-native-svg';

import { colors } from '../theme/tokens';

/**
 * Renders a string grid as square pixels — the only kind of illustration a
 * dot-matrix screen can honestly show. Any character other than a space or a
 * dot lights the pixel.
 */
export function PixelArt({
  rows,
  size,
  color = colors.ink,
}: {
  rows: readonly string[];
  /** Total width in points; pixel size is derived from the grid. */
  size: number;
  color?: string;
}) {
  const cols = Math.max(...rows.map((r) => r.length));
  const px = size / cols;
  const height = px * rows.length;

  return (
    <Svg width={size} height={height}>
      {rows.flatMap((row, y) =>
        row.split('').map((cell, x) =>
          cell === ' ' || cell === '.' ? null : (
            <Rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={color} />
          ),
        ),
      )}
    </Svg>
  );
}

export const PIXEL_LOCK = [
  '..####..',
  '.#....#.',
  '.#....#.',
  '########',
  '##....##',
  '##.##.##',
  '##.##.##',
  '########',
] as const;

export const PIXEL_CHECK = [
  '.......#',
  '......##',
  '.....##.',
  '#...##..',
  '##.##...',
  '.####...',
  '..##....',
  '........',
] as const;

export const PIXEL_STAR = [
  '...##...',
  '...##...',
  '.######.',
  '########',
  '..####..',
  '.##..##.',
  '##....##',
  '........',
] as const;

export const PIXEL_CLOCK = [
  '..####..',
  '.#....#.',
  '#..##..#',
  '#..##..#',
  '#..####.',
  '#......#',
  '.#....#.',
  '..####..',
] as const;
