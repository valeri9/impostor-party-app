import { useRef } from 'react';
import { Animated } from 'react-native';

/**
 * The squash-and-recover a real button gives when pressed. Shared so every
 * tappable surface — buttons, chips, swatches, the D-pad steppers — settles
 * with the same weight instead of each screen inventing its own timing.
 */
export function usePressScale(scaleTo = 0.93) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scale, { toValue: scaleTo, duration: 60, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 9 }).start();
  };

  return { scale, onPressIn, onPressOut };
}
