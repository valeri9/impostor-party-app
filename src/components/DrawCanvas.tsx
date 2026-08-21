import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import type { Stroke } from '../game/types';
import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { useSkinTokens } from '../theme/SkinContext';
import { stroke as line } from '../theme/tokens';

/** Ignore sub-pixel jitter so a single stroke stays a manageable path string. */
const MIN_STEP = 2;

type Props = {
  strokes: Stroke[];
  color: string;
  /** False once this player's stroke is locked, or between turns. */
  enabled: boolean;
  onStrokeStart?: () => void;
  onStrokeComplete: (d: string) => void;
  /** Reported once so the finished drawing can be replayed at the same aspect. */
  onMeasure?: (width: number, height: number) => void;
};

export function DrawCanvas({ strokes, color, enabled, onStrokeStart, onStrokeComplete, onMeasure }: Props) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [livePath, setLivePath] = useState('');
  const pointsRef = useRef<string[]>([]);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  // Held in refs so the responder closure always sees current values.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const completeRef = useRef(onStrokeComplete);
  completeRef.current = onStrokeComplete;
  const startRef = useRef(onStrokeStart);
  startRef.current = onStrokeStart;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabledRef.current,
        onMoveShouldSetPanResponder: () => enabledRef.current,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          haptics.light();
          playSound('tick');
          startRef.current?.();
          pointsRef.current = [`M${x.toFixed(1)} ${y.toFixed(1)}`];
          lastRef.current = { x, y };
          setLivePath(pointsRef.current.join(' '));
        },

        onPanResponderMove: (evt) => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          const last = lastRef.current;
          if (last && Math.hypot(x - last.x, y - last.y) < MIN_STEP) return;
          lastRef.current = { x, y };
          pointsRef.current.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
          setLivePath(pointsRef.current.join(' '));
        },

        // Release — or any interruption — ends the turn. That is the whole game.
        onPanResponderRelease: () => finish(),
        onPanResponderTerminate: () => finish(),
      }),
    [],
  );

  function finish() {
    const points = pointsRef.current;
    pointsRef.current = [];
    lastRef.current = null;
    setLivePath('');
    // A tap with no movement is not a stroke; let the player try again.
    if (points.length < 2) return;
    haptics.success();
    playSound('chime');
    completeRef.current(points.join(' '));
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
    onMeasure?.(width, height);
  };

  return (
    <View testID="draw-canvas" style={styles.canvas} onLayout={onLayout} {...responder.panHandlers}>
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={colors.bgDeep} />
          {strokes.map((stroke, i) => (
            <Path
              key={`${stroke.playerId}-${i}`}
              d={stroke.d}
              stroke={stroke.color}
              strokeWidth={6}
              strokeLinecap="square"
              strokeLinejoin="miter"
              fill="none"
            />
          ))}
          {livePath ? (
            <Path
              d={livePath}
              stroke={color}
              strokeWidth={6}
              strokeLinecap="square"
              strokeLinejoin="miter"
              fill="none"
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Read-only render of a finished drawing, scaled to the given width. */
export function DrawingPreview({
  strokes,
  canvas,
  width,
}: {
  strokes: Stroke[];
  canvas: { width: number; height: number } | null;
  width: number;
}) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Fall back to a square if the drawing phase never reported its layout.
  const source = canvas ?? { width: 1, height: 1 };
  const height = (width * source.height) / source.width;

  return (
    <View style={[styles.preview, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${source.width} ${source.height}`}>
        <Rect x={0} y={0} width={source.width} height={source.height} fill={colors.bgDeep} />
        {strokes.map((stroke, i) => (
          <Path
            key={`${stroke.playerId}-${i}`}
            d={stroke.d}
            stroke={stroke.color}
            strokeWidth={6}
            strokeLinecap="square"
            strokeLinejoin="miter"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    canvas: {
      flex: 1,
      width: '100%',
      borderWidth: line.thick,
      borderColor: colors.ink,
      overflow: 'hidden',
      backgroundColor: colors.bgDeep,
    },
    preview: {
      borderWidth: line.thick,
      borderColor: colors.ink,
      overflow: 'hidden',
      alignSelf: 'center',
    },
  });
}
