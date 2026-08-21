import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect, SvgXml } from 'react-native-svg';

import { usePrefersReducedMotion } from '../native/reduceMotion';
import {
  CLOUDS_SVG,
  PALM_LEFT_SVG,
  PALM_PIVOTS,
  PALM_RIGHT_SVG,
  PROPS_SVG,
  SAND_COLOR,
  SAND_FLECK_COLOR,
  SAND_FLECK_RECTS,
  SAND_TILE_SIZE,
  SCENE_ASPECT_RATIO,
  SKY_SVG,
  TIDE_FRAMES,
} from '../theme/scenes/shoreline';

/**
 * An infinitely-tileable patch of the beach's own dry sand, using the exact
 * fleck rule sandAndFoam paints the scene's sand with (see gen-shoreline.js)
 * — not a flat color guess. Sits behind the hero scene as the permanent
 * floor, so whatever's below the scene's own aspect-locked box (the rest of
 * a tall screen) still reads as real, matching sand texture rather than a
 * seamed, flatter patch.
 */
export function SandFill() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="sandFill" width={SAND_TILE_SIZE} height={SAND_TILE_SIZE} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={SAND_TILE_SIZE} height={SAND_TILE_SIZE} fill={SAND_COLOR} />
            {SAND_FLECK_RECTS.map((r) => (
              <Rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.size} height={r.size} fill={SAND_FLECK_COLOR} />
            ))}
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#sandFill)" />
      </Svg>
    </View>
  );
}

/**
 * The Shoreline skin's animated beach banner, stacked in one 400x320
 * coordinate space (see shoreline.ts): a static sky, a cloud strip drifting
 * sideways on a seamless loop, three sea frames cross-fading for the tide,
 * static umbrellas/towels on the sand, and two palms swaying around their
 * own base. Nothing here is interactive — it's a look, not a control.
 */
export function BeachScene() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={styles.container} onLayout={onLayout} pointerEvents="none">
      <SvgXml xml={SKY_SVG} width="100%" height="100%" style={StyleSheet.absoluteFillObject} />
      {size ? <CloudLayer width={size.width} height={size.height} reduceMotion={reduceMotion} /> : null}
      <TideLayer reduceMotion={reduceMotion} />
      <SvgXml xml={PROPS_SVG} width="100%" height="100%" style={StyleSheet.absoluteFillObject} />
      {size ? (
        <PalmLayer
          xml={PALM_LEFT_SVG}
          pivot={PALM_PIVOTS[0]}
          size={size}
          duration={2200}
          fromDeg={-2.2}
          toDeg={2}
          reduceMotion={reduceMotion}
        />
      ) : null}
      {size ? (
        <PalmLayer
          xml={PALM_RIGHT_SVG}
          pivot={PALM_PIVOTS[1]}
          size={size}
          duration={2600}
          fromDeg={1.8}
          toDeg={-2.4}
          reduceMotion={reduceMotion}
        />
      ) : null}
    </View>
  );
}

function CloudLayer({
  width,
  height,
  reduceMotion,
}: {
  width: number;
  height: number;
  reduceMotion: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, reduceMotion]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.clip]}>
      <Animated.View style={{ width: width * 2, height, transform: [{ translateX }] }}>
        <SvgXml xml={CLOUDS_SVG} width="100%" height="100%" />
      </Animated.View>
    </View>
  );
}

/** Three sea/sand frames cross-fading through a loop — frame 0 sits at the
 *  bottom always fully opaque, so the water never has "nothing" to show
 *  between fades; frames 1 and 2 each pulse in and out at staggered times. */
function TideLayer({ reduceMotion }: { reduceMotion: boolean }) {
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const pulse = (value: Animated.Value, delayBefore: number, delayAfter: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayBefore),
          Animated.timing(value, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.delay(400),
          Animated.timing(value, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.delay(delayAfter),
        ]),
      );
    const loopB = pulse(b, 300, 1900);
    const loopC = pulse(c, 1900, 300);
    loopB.start();
    loopC.start();
    return () => {
      loopB.stop();
      loopC.stop();
    };
  }, [b, c, reduceMotion]);

  return (
    <>
      <SvgXml xml={TIDE_FRAMES[0]} width="100%" height="100%" style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: b }]}>
        <SvgXml xml={TIDE_FRAMES[1]} width="100%" height="100%" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: c }]}>
        <SvgXml xml={TIDE_FRAMES[2]} width="100%" height="100%" />
      </Animated.View>
    </>
  );
}

function PalmLayer({
  xml,
  pivot,
  size,
  duration,
  fromDeg,
  toDeg,
  reduceMotion,
}: {
  xml: string;
  pivot: { xPct: number; yPct: number };
  size: { width: number; height: number };
  duration: number;
  fromDeg: number;
  toDeg: number;
  reduceMotion: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, reduceMotion]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: [`${fromDeg}deg`, `${toDeg}deg`] });
  // A custom rotation pivot: RN always rotates around a view's own centre,
  // so shift the trunk's base to the origin, rotate, then shift it back.
  const offsetX = pivot.xPct * size.width - size.width / 2;
  const offsetY = pivot.yPct * size.height - size.height / 2;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          transform: [
            { translateX: offsetX },
            { translateY: offsetY },
            { rotate },
            { translateX: -offsetX },
            { translateY: -offsetY },
          ],
        },
      ]}
    >
      <SvgXml xml={xml} width="100%" height="100%" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: SCENE_ASPECT_RATIO,
    overflow: 'hidden',
  },
  clip: { overflow: 'hidden' },
});
