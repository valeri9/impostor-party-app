import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { colors, spacing, stroke, type } from '../theme/tokens';
import { PIXEL_LOCK, PixelArt } from './PixelArt';

/**
 * Continuous hold required before the pass-along button unlocks. Short enough
 * that a genuine glance at the secret clears it without waiting, long enough
 * that brushing the screen while handing the phone over does not.
 */
const UNLOCK_MS = 200;

type Props = {
  playerName: string;
  /** The secret. Rendered ONLY while the finger is down. */
  children: React.ReactNode;
  /** Optional accent used for the shield frame, so modes feel distinct. */
  accent?: string;
  onHoldStart?: () => void;
  /** Fires the first time the player completes a real hold. */
  onUnlocked?: () => void;
};

/**
 * The universal pass-and-play privacy gate.
 *
 * Two rules drive the implementation:
 *   1. The secret is *conditionally rendered*, never merely covered or faded —
 *      releasing the finger cannot leave a readable frame behind.
 *   2. Losing the touch for any reason (release, cancel, app backgrounded)
 *      hides it immediately.
 */
export function HoldToReveal({ playerName, children, accent = colors.ink, onHoldStart, onUnlocked }: Props) {
  const { t } = useI18n();
  const [held, setHeld] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drives the secret's entrance — a quick unfold, like a card being flipped
  // face-up, rather than a flat cut from shield to content.
  const revealAnim = useRef(new Animated.Value(0)).current;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setHeld((wasHeld) => {
      if (wasHeld) haptics.light();
      return false;
    });
  }, [clearTimer]);

  // Backgrounding the app (app switcher, screenshot, notification pull-down)
  // must not leave the secret on a snapshot of the screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') hide();
    });
    return () => sub.remove();
  }, [hide]);

  useEffect(() => clearTimer, [clearTimer]);

  const handlePressIn = useCallback(() => {
    haptics.medium();
    setHeld(true);
    onHoldStart?.();
    revealAnim.setValue(0);
    Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 6 }).start();
    clearTimer();
    timerRef.current = setTimeout(() => {
      setUnlocked(true);
      haptics.success();
      playSound('pop');
      onUnlocked?.();
    }, UNLOCK_MS);
  }, [clearTimer, onHoldStart, onUnlocked, revealAnim]);

  return (
    <View style={styles.wrap}>
      <Pressable
        testID="hold-target"
        style={styles.pressable}
        onPressIn={handlePressIn}
        onPressOut={hide}
        onTouchCancel={hide}
        delayLongPress={UNLOCK_MS}
        accessibilityRole="button"
        accessibilityLabel={`${t('reveal.shield', { name: playerName })}. ${t('reveal.holdHint')}`}
      >
        {held ? (
          <Animated.View
            testID="secret-content"
            style={[
              styles.secret,
              { borderColor: accent },
              {
                opacity: revealAnim,
                transform: [{ scaleY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
              },
            ]}
          >
            {children}
          </Animated.View>
        ) : (
          <Shield playerName={playerName} accent={accent} />
        )}
      </Pressable>

      <Text style={styles.footHint}>
        {held ? t('reveal.holding') : unlocked ? t('reveal.holdHint') : t('reveal.nextLocked')}
      </Text>
    </View>
  );
}

/** The only thing a bystander can ever see: a name and an instruction. */
function Shield({ playerName, accent }: { playerName: string; accent: string }) {
  const { t } = useI18n();
  return (
    <View testID="shield" style={[styles.shield, { borderColor: accent }]}>
      <View style={styles.lockBadge}>
        <PixelArt rows={PIXEL_LOCK} size={64} color={colors.onInk} />
      </View>
      <Text style={styles.shieldName} numberOfLines={2} adjustsFontSizeToFit>
        {t('reveal.shield', { name: playerName })}
      </Text>
      <Text style={styles.shieldHint}>{t('reveal.holdHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%' },
  pressable: { flex: 1, width: '100%' },
  shield: {
    flex: 1,
    borderWidth: stroke.thick,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  lockBadge: {
    backgroundColor: colors.ink,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  shieldName: { ...type.title, color: colors.ink, textAlign: 'center' },
  shieldHint: { ...type.caption, color: colors.inkSoft, textAlign: 'center', textTransform: 'uppercase' },
  secret: {
    flex: 1,
    borderWidth: stroke.thick,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  footHint: {
    ...type.caption,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    minHeight: 18,
  },
});
