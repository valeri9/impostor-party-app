import React, { useId, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Pattern,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import type { Suit } from '../game/types';
import { useSkinTokens } from '../theme/SkinContext';
import { PIXEL_FONT } from '../theme/tokens';

const ASPECT = 0.7; // width / height, close to a real 63×88 mm poker card
const VB_W = 250;
const VB_H = VB_W / ASPECT;

const SUIT_GLYPH: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

function suitColor(suit: Suit, colors: ReturnType<typeof useSkinTokens>['colors']): string {
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
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const height = width / ASPECT;
  // Every card on screen draws its own clip path, so the ids have to differ —
  // the results grid renders five at once into one SVG namespace.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <View style={styles.stack}>
      <View style={[styles.shadow, { width, height }]}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {faceUp ? <CardFace rank={rank} suit={suit} uid={uid} /> : <CardBack color={colors.cardBack} uid={uid} />}
        </Svg>
      </View>
      {faceUp && roleLabel ? (
        // Printed under the card rather than across its face: on the small
        // results cards the banner used to sit on top of the bottom-right
        // index, and neither could be read.
        <View style={[styles.roleBanner, { width, backgroundColor: suitColor(suit, colors) }]}>
          <Text
            style={[styles.roleText, { color: colors.cardFace, fontSize: roleFontSize(width) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            allowFontScaling={false}
          >
            {roleLabel.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** The banner has to read on a 110pt results card and a 230pt reveal card alike. */
function roleFontSize(width: number): number {
  return Math.round(Math.min(16, Math.max(9, width * 0.1)));
}

function CardBack({ color, uid }: { color: string; uid: string }) {
  const { colors, LCD } = useSkinTokens();
  return (
    <G>
      <Defs>
        <Pattern id={`lattice-${uid}`} width={26} height={26} patternUnits="userSpaceOnUse">
          <Rect width={26} height={26} fill={color} />
          <Path d="M13 2 L24 13 L13 24 L2 13 Z" fill="none" stroke={colors.cardFace} strokeWidth={2} />
          <Path d="M13 8 L18 13 L13 18 L8 13 Z" fill={LCD.light} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill={colors.cardFace} />
      <Rect
        x={3}
        y={3}
        width={VB_W - 6}
        height={VB_H - 6}
        fill="none"
        stroke={colors.cardBlack}
        strokeWidth={6}
      />
      <Rect x={12} y={12} width={VB_W - 24} height={VB_H - 24} fill={color} />
      <Rect x={18} y={18} width={VB_W - 36} height={VB_H - 36} fill={`url(#lattice-${uid})`} />
      <Rect
        x={18}
        y={18}
        width={VB_W - 36}
        height={VB_H - 36}
        fill="none"
        stroke={colors.cardFace}
        strokeWidth={4}
      />
    </G>
  );
}

function CardFace({ rank, suit, uid }: { rank: string; suit: Suit; uid: string }) {
  const { colors } = useSkinTokens();
  const color = suitColor(suit, colors);
  const glyph = SUIT_GLYPH[suit];
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K';
  const isAce = rank === 'A';
  const faceBottom = VB_H * 0.88;
  const faceTop = VB_H * 0.13;

  return (
    <G>
      <Defs>
        {/* Text metrics differ per platform and per font fallback, so the
            rotated bottom index can reach further than its measured box
            suggests. Clipping to the face guarantees nothing is ever painted
            over the border or outside the card, whatever the metrics say. */}
        <ClipPath id={`face-${uid}`}>
          <Rect x={6} y={6} width={VB_W - 12} height={VB_H - 12} />
        </ClipPath>
      </Defs>

      <Rect x={0} y={0} width={VB_W} height={VB_H} fill={colors.cardFace} />
      <Rect
        x={3}
        y={3}
        width={VB_W - 6}
        height={VB_H - 6}
        fill="none"
        stroke={colors.cardBlack}
        strokeWidth={6}
      />

      <G clipPath={`url(#face-${uid})`}>
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
      </G>
    </G>
  );
}

/** Rank over suit in the top-left, as printed on a real card. */
function CornerIndex({ rank, glyph, color }: { rank: string; glyph: string; color: string }) {
  return (
    <G>
      <SvgText
        x={30}
        y={44}
        fontSize={rank === '10' ? 32 : 38}
        fontWeight="bold"
        fontFamily={PIXEL_FONT}
        fill={color}
        textAnchor="middle"
      >
        {rank}
      </SvgText>
      <SvgText x={30} y={78} fontSize={30} fill={color} textAnchor="middle">
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
      <Rect x={x} y={top} width={w} height={h} fill="none" stroke={color} strokeWidth={3} />
      <Rect x={x + 6} y={top + 6} width={w - 12} height={h - 12} fill="none" stroke={color} strokeWidth={1} />
      <Line x1={x} y1={midY} x2={x + w} y2={midY} stroke={color} strokeWidth={3} />

      <G>
        <SvgText
          x={VB_W / 2}
          y={top + h * 0.27}
          fontSize={62}
          fontWeight="bold"
          fontFamily={PIXEL_FONT}
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
          fontFamily={PIXEL_FONT}
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

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    stack: { alignItems: 'center' },
    // No blur: a dot-matrix screen can only draw an outline, and it is drawn
    // inside the SVG so it never eats into the card's measured box.
    shadow: { backgroundColor: colors.cardFace },
    roleBanner: {
      marginTop: 4,
      paddingVertical: 3,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleText: {
      fontFamily: PIXEL_FONT,
      fontWeight: '700',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
  });
}
