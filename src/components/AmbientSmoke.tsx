import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { usePrefersReducedMotion } from '../native/reduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A single soft wisp of colour — a shade off the screen's own background,
 * never a new hue — that rises through the LCD like smoke: it grows, drifts
 * up and gently sideways, and thins back out to nothing as it goes. Purely
 * decorative background life for the two skins that don't get a bespoke
 * scene (see Screen.tsx); Shoreline keeps its own beach banner untouched.
 *
 * Animates raw SVG attributes (cx/cy/r/opacity) directly rather than a
 * `transform`, since react-native-svg's array-style transform prop doesn't
 * resolve an Animated value mixed with static entries. That means this runs
 * on the JS thread, not the native driver — fine for one slow-moving shape.
 */
export function AmbientSmoke({ color }: { color: string }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  // Picked once per mount — enough variety that the screen doesn't rise
  // from the same spot every time it's opened, without the wisp's path
  // visibly changing mid-play.
  const { startX, driftX, duration } = useMemo(
    () => ({
      startX: 0.2 + Math.random() * 0.6, // keeps the source off the very edges
      driftX: (Math.random() - 0.5) * 0.3, // gentle sideways wander as it rises
      duration: 8000 + Math.random() * 4000,
    }),
    [],
  );

  useEffect(() => {
    if (reduceMotion || !size) return;
    // Animated.loop resets the value to its start before each pass, so this
    // is just "rise and dissolve, then sit invisible for a beat" repeated.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: false }),
        Animated.delay(1800),
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

  let cx: number | Animated.AnimatedInterpolation<number> = 0;
  let cy: number | Animated.AnimatedInterpolation<number> = 0;
  let r: number | Animated.AnimatedInterpolation<number> = 0;
  let opacity: number | Animated.AnimatedInterpolation<number> = 0;

  if (size) {
    const originX = size.width * startX;
    // Rises from just below the bottom edge to just above the top one.
    cy = anim.interpolate({ inputRange: [0, 1], outputRange: [size.height * 1.05, -size.height * 0.15] });
    cx = anim.interpolate({ inputRange: [0, 1], outputRange: [originX, originX + size.width * driftX] });
    // Starts as a small, dense puff and spreads out as it climbs, the way
    // real smoke thins the further it gets from its source.
    const maxRadius = Math.max(size.width, size.height) * 0.4;
    r = anim.interpolate({ inputRange: [0, 1], outputRange: [maxRadius * 0.25, maxRadius] });
    // Fades in quickly, then dissolves slowly over the rest of the climb —
    // smoke thins out gradually, it doesn't just switch off.
    opacity = anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size ? (
        <Svg width="100%" height="100%">
          <Defs>
            {/* A radial fade only reaches full strength at the exact centre
                point, so a plain 0→1 stop leaves almost the whole puff
                faded — holding it solid out to 45% of the radius first
                gives it a real dense core, like the streak's band did. */}
            <RadialGradient id="smokePuff" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={1} />
              <Stop offset="0.45" stopColor={color} stopOpacity={1} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <AnimatedCircle cx={cx} cy={cy} r={r} fill="url(#smokePuff)" opacity={opacity} />
        </Svg>
      ) : null}
    </View>
  );
}
