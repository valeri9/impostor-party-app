import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether the OS-level "reduce motion" accessibility setting is on, so
 *  purely decorative animation (the Shoreline skin's beach scene) can stay
 *  still for anyone who's asked their device to cut down on motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (!cancelled) setReduced(!!value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => setReduced(!!value));
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
