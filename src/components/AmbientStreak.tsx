import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { usePrefersReducedMotion } from '../native/reduceMotion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * A single soft streak of colour — a shade off the screen's own background,
 * never a new hue — that drifts across the LCD on a loop and fades away
 * again. Purely decorative background life for the two skins that don't get
 * a bespoke scene (see Screen.tsx): the screen still reads as flat 1-bit
 * content, it just isn't perfectly static anymore.
 *
 * The lean is a plain (unanimated) rotation on the wrapping View; only the
 * rect's own `x` is animated. react-native-svg's array-style `transform`
 * prop doesn't resolve an Animated value mixed with static entries — it
 * serialises the Animated node itself into the transform string instead of
 * its current number, which breaks the SVG parser. Animating a raw
 * coordinate attribute like `x` is the well-supported path, at the cost of
 * running on the JS thread rather than the native driver.
 */
export function AmbientStreak({ color }: { color: string }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  // Picked once per mount, not per loop — enough variety that the screen
  // doesn't look identical every time it's opened, without the streak's
  // path visibly changing mid-play.
  const { angleDeg, top, duration } = useMemo(
    () => ({
      angleDeg: 18 + Math.random() * 20, // 18°–38°, always the same lean
      top: 0.1 + Math.random() * 0.6, // vertical placement, kept off the very edges
      duration: 9000 + Math.random() * 3000,
    }),
    [],
  );

  useEffect(() => {
    if (reduceMotion || !size) return;
    // Animated.loop resets the value to its start before each pass, so this
    // is just "sweep across, then sit invisible (off-screen) for a beat"
    // repeated — no manual reset step needed.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.delay(1400),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, reduceMotion, size]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  if (reduceMotion) {
    return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout} />;
  }

  // Long enough that even at the steepest lean it still clears the screen
  // corner-to-corner; travels from just off the left edge to just off the
  // right, so the fade-in/out at each end of the gradient does the work of
  // hiding its entry and exit rather than a hard clip.
  const length = size ? Math.hypot(size.width, size.height) * 1.4 : 0;
  const thickness = size ? Math.max(60, size.height * 0.18) : 0;
  const x = size
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [-length * 0.7, size.width + length * 0.7] })
    : 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size ? (
        <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${angleDeg}deg` }] }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="streakFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={color} stopOpacity={0} />
                <Stop offset="0.5" stopColor={color} stopOpacity={1} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <AnimatedRect
              x={x}
              y={size.height * top - thickness / 2}
              width={length}
              height={thickness}
              fill="url(#streakFade)"
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}
