import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Thin wrapper so screens never have to care about platform support.
 * Web falls back to navigator.vibrate; failures are swallowed because haptics
 * are always an enhancement, never a requirement for play.
 */

function webVibrate(pattern: number | number[]) {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }) : undefined;
  nav?.vibrate?.(pattern);
}

export const haptics = {
  light() {
    if (Platform.OS === 'web') return webVibrate(10);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (Platform.OS === 'web') return webVibrate(25);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy() {
    if (Platform.OS === 'web') return webVibrate(45);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success() {
    if (Platform.OS === 'web') return webVibrate([15, 40, 15]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    if (Platform.OS === 'web') return webVibrate([30, 60, 30]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  selection() {
    if (Platform.OS === 'web') return webVibrate(8);
    Haptics.selectionAsync().catch(() => {});
  },
};
