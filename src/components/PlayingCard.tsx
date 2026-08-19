import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  G,
  Line,
  Path,
  Pattern,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import type { Suit } from '../game/types';
import { colors } from '../theme/tokens';

const ASPECT = 0.7; // width / height, close to a real 63×88 mm poker card
const VB_W = 250;
const VB_H = VB_W / ASPECT;

const SUIT_GLYPH: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? colors.cardRed : colors.cardBlack;
}

/**
 * Standard pip layouts. Coordinates are fractions of the inner face area;
 * pips below the midline are rotated 180° exactly as on a printed card.
 */
const PIP_LAYOUTS: Record<string, Array<[number, number]>> = {
  '2': [[0.5, 0.17], [0.5, 0.83]],
  '3': [[0.5, 0.17], [0.5, 0.5], [0.5, 0.83]],
  '4': [[0.28, 0.17], [0.72, 0.17], [0.28, 0.83], [0.72, 0.83]],
  '5': [[0.28, 0.17], [0.72, 0.17], [0.5, 0.5], [0.28, 0.83], [0.72, 0.83]],
  '6': [[0.28, 0.17], [0.72, 0.17], [0.28, 0.5], [0.72, 0.5], [0.28, 0.83], [0.72, 0.83]],
  '7': [
    [0.28, 0.17], [0.72, 0.17], [0.5, 0.335],
    [0.28, 0.5], [0.72, 0.5], [0.28, 0.83], [0.72, 0.83],
  ],
  '8': [
    [0.28, 0.17], [0.72, 0.17], [0.5, 0.335],
    [0.28, 0.5], [0.72, 0.5], [0.5, 0.665],
    [0.28, 0.83], [0.72, 0.83],
  ],
  '9': [
    [0.28, 0.17], [0.72, 0.17], [0.28, 0.39], [0.72, 0.39],
    [0.5, 0.5],
    [0.28, 0.61], [0.72, 0.61], [0.28, 0.83], [0.72, 0.83],
  ],
  '10': [
    [0.28, 0.17], [0.72, 0.17], [0.5, 0.28],
    [0.28, 0.39], [0.72, 0.39], [0.28, 0.61], [0.72, 0.61],
    [0.5, 0.72], [0.28, 0.83], [0.72, 0.83],
  ],
};

type Props = {
  rank: string;
  suit: Suit;
  width: number;
  /** Face down renders the patterned back and no rank information at all. */
  faceUp: boolean;
  /** Localized role name printed across the lower face. */
  roleLabel?: string;
  backColor?: 'red' | 'blue';
};

export function PlayingCard({ rank, suit, width, faceUp, roleLabel, backColor = 'red' }: Props) {
  const height = width / ASPECT;
  return (
    <View style={[styles.shadow, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {faceUp ? (
          <CardFace rank={rank} suit={suit} roleLabel={roleLabel} />
        ) : (
          <CardBack color={backColor === 'red' ? colors.cardBackRed : colors.cardBackBlue} />
        )}
      </Svg>
    </View>
  );
}

function CardBack({ color }: { color: string }) {
  return (
    <G>
      <Defs>
        <Pattern id="lattice" width={26} height={26} patternUnits="userSpaceOnUse">
          <Rect width={26} height={26} fill={color} />
          <Path d="M13 2 L24 13 L13 24 L2 13 Z" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
          <Path d="M13 8 L18 13 L13 18 L8 13 Z" fill="rgba(255,255,255,0.28)" />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={VB_H} rx={18} fill={colors.cardFace} />
      <Rect x={10} y={10} width={VB_W - 20} height={VB_H - 20} rx={12} fill={color} />
      <Rect x={18} y={18} width={VB_W - 36} height={VB_H - 36} rx={8} fill="url(#lattice)" />
      <Rect
        x={18}
        y={18}
        width={VB_W - 36}
        height={VB_H - 36}
        rx={8}
        fill="none"
        stroke={colors.cardFace}
        strokeWidth={4}
      />
    </G>
  );
}

function CardFace({ rank, suit, roleLabel }: { rank: string; suit: Suit; roleLabel?: string }) {
  const color = suitColor(suit);
  const glyph = SUIT_GLYPH[suit];
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K';
  const isAce = rank === 'A';
  // Reserve the bottom strip for the role name when there is one.
  const faceBottom = roleLabel ? VB_H * 0.78 : VB_H * 0.88;
  const faceTop = VB_H * 0.13;

  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} rx={18} fill={colors.cardFace} />
      <Rect
        x={4}
        y={4}
        width={VB_W - 8}
        height={VB_H - 8}
        rx={15}
        fill="none"
        stroke="rgba(0,0,0,0.12)"
        strokeWidth={2}
      />

      <CornerIndex rank={rank} glyph={glyph} color={color} />
      <G transform={`rotate(180 ${VB_W / 2} ${VB_H / 2})`}>
        <CornerIndex rank={rank} glyph={glyph} color={color} />
      </G>

      {isAce ? (
        <SvgText
          x={VB_W / 2}
          y={(faceTop + faceBottom) / 2}
          fontSize={128}
          fill={color}
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {glyph}
        </SvgText>
      ) : isCourt ? (
        <CourtPanel rank={rank} glyph={glyph} color={color} top={faceTop} bottom={faceBottom} />
      ) : (
        <Pips rank={rank} glyph={glyph} color={color} top={faceTop} bottom={faceBottom} />
      )}

      {roleLabel ? (
        <G>
          <Rect
            x={16}
            y={VB_H * 0.82}
            width={VB_W - 32}
            height={VB_H * 0.11}
            rx={9}
            fill={color}
            opacity={0.1}
          />
          <SvgText
            x={VB_W / 2}
            y={VB_H * 0.876}
            fontSize={22}
            fontWeight="bold"
            fill={color}
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {roleLabel.toUpperCase()}
          </SvgText>
        </G>
      ) : null}
    </G>
  );
}

/** Rank over suit in the top-left, as printed on a real card. */
function CornerIndex({ rank, glyph, color }: { rank: string; glyph: string; color: string }) {
  return (
    <G>
      <SvgText
        x={22}
        y={40}
        fontSize={rank === '10' ? 32 : 38}
        fontWeight="bold"
        fill={color}
        textAnchor="middle"
      >
        {rank}
      </SvgText>
      <SvgText x={22} y={72} fontSize={30} fill={color} textAnchor="middle">
        {glyph}
      </SvgText>
    </G>
  );
}

function Pips({
  rank,
  glyph,
  color,
  top,
  bottom,
}: {
  rank: string;
  glyph: string;
  color: string;
  top: number;
  bottom: number;
}) {
  const layout = PIP_LAYOUTS[rank] ?? PIP_LAYOUTS['2'];
  const left = VB_W * 0.16;
  const innerW = VB_W * 0.68;
  const innerH = bottom - top;

  return (
    <G>
      {layout.map(([fx, fy], i) => {
        const x = left + fx * innerW;
        const y = top + fy * innerH;
        const flipped = fy > 0.55;
        return (
          <G key={i} transform={flipped ? `rotate(180 ${x} ${y})` : undefined}>
            <SvgText
              x={x}
              y={y}
              fontSize={40}
              fill={color}
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {glyph}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

/** Abstract court-card panel: a mirrored two-tone frame, as on J/Q/K faces. */
function CourtPanel({
  rank,
  glyph,
  color,
  top,
  bottom,
}: {
  rank: string;
  glyph: string;
  color: string;
  top: number;
  bottom: number;
}) {
  const x = VB_W * 0.17;
  const w = VB_W * 0.66;
  const h = bottom - top;
  const midY = top + h / 2;

  return (
    <G>
      <Rect x={x} y={top} width={w} height={h} rx={10} fill="none" stroke={color} strokeWidth={3} />
      <Rect x={x + 6} y={top + 6} width={w - 12} height={h - 12} rx={7} fill={color} opacity={0.08} />
      <Line x1={x} y1={midY} x2={x + w} y2={midY} stroke={color} strokeWidth={3} />

      <G>
        <SvgText
          x={VB_W / 2}
          y={top + h * 0.27}
          fontSize={62}
          fontWeight="bold"
          fill={color}
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {rank}
        </SvgText>
        <SvgText
          x={VB_W / 2}
          y={top + h * 0.4}
          fontSize={34}
          fill={color}
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {glyph}
        </SvgText>
      </G>

      <G transform={`rotate(180 ${VB_W / 2} ${midY})`}>
        <SvgText
          x={VB_W / 2}
          y={top + h * 0.27}
          fontSize={62}
          fontWeight="bold"
          fill={color}
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {rank}
        </SvgText>
        <SvgText
          x={VB_W / 2}
          y={top + h * 0.4}
          fontSize={34}
          fill={color}
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {glyph}
        </SvgText>
      </G>
    </G>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
