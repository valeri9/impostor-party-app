import React, { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { useSkinTokens } from '../theme/SkinContext';
import { HIT_SIZE, spacing, stroke, type } from '../theme/tokens';
import { usePressScale } from './pressAnim';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost';

type Props = {
  label: string;
  /**
   * Rendered beside the label in the system font. An emoji inside the pixel
   * font's own text run forces Android to substitute a fallback face for the
   * whole line, and it measures that line with the fallback's metrics — which
   * is how a one-line button grew into a tall block with no visible text.
   */
  icon?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Oversized target for the game's headline actions. */
  large?: boolean;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Buttons are hardware, not screen content, so they are moulded in the
 * console's own colours: the crimson of the A/B buttons for the affirmative
 * actions, the navy of the printed labels for the ones that end a round.
 */
type VariantSpec = {
  fill: string;
  pressedFill: string;
  border: string;
  label: string;
  pressedLabel: string;
  /** A second inner line, for the loudest actions on a screen. */
  doubleFrame: boolean;
  width: number;
};

function getVariants(SHELL: ReturnType<typeof useSkinTokens>['SHELL']): Record<ButtonVariant, VariantSpec> {
  return {
    primary: {
      fill: SHELL.button,
      pressedFill: SHELL.buttonDeep,
      border: SHELL.buttonDeep,
      label: SHELL.onButton,
      // Pressed state reads against `buttonDeep`, not `button` — for skins
      // where those two sit far apart in lightness (Neon Nebula's white
      // button vs. its mid-purple pressed fill), onButton alone can't read
      // against both. onPrint is tuned for a dark-ish fill in every skin.
      pressedLabel: SHELL.onPrint,
      doubleFrame: false,
      width: stroke.thin,
    },
    success: {
      fill: SHELL.button,
      pressedFill: SHELL.buttonDeep,
      border: SHELL.buttonDeep,
      label: SHELL.onButton,
      pressedLabel: SHELL.onPrint,
      doubleFrame: true,
      width: stroke.thick,
    },
    danger: {
      fill: SHELL.print,
      pressedFill: SHELL.printDeep,
      border: SHELL.printDeep,
      // Always onPrint, not onButton — this variant's fill is `print`, and
      // in a skin where `button` and `print` sit at opposite ends of the
      // lightness scale (Neon Nebula), onButton is tuned for the wrong fill.
      label: SHELL.onPrint,
      pressedLabel: SHELL.onPrint,
      doubleFrame: true,
      width: stroke.thick,
    },
    ghost: {
      fill: 'transparent',
      pressedFill: SHELL.print,
      border: SHELL.print,
      label: SHELL.print,
      pressedLabel: SHELL.onPrint,
      doubleFrame: false,
      width: stroke.hair,
    },
  };
}

export function Button({ label, icon, onPress, variant = 'primary', disabled, large, style, testID }: Props) {
  const { SHELL } = useSkinTokens();
  const variants = useMemo(() => getVariants(SHELL), [SHELL]);
  const spec = variants[variant];
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={() => {
          if (disabled) return;
          playSound('click');
          haptics.light();
          onPressIn();
        }}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        style={({ pressed }) => [
          styles.base,
          large && styles.large,
          {
            backgroundColor: pressed ? spec.pressedFill : spec.fill,
            borderWidth: spec.width,
            borderColor: spec.border,
          },
          disabled && styles.disabled,
        ]}
      >
        {({ pressed }) => {
          const fg = pressed ? spec.pressedLabel : spec.label;
          return (
            <View
              pointerEvents="none"
              style={[
                styles.inner,
                large && styles.innerLarge,
                spec.doubleFrame && { borderWidth: stroke.hair, borderColor: fg },
              ]}
            >
              {icon ? (
                <Text style={[styles.icon, { color: fg }]} allowFontScaling={false}>
                  {icon}
                </Text>
              ) : null}
              <Text
                style={[styles.label, large && styles.labelLarge, { color: fg }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                // The console's type is pixel art at a fixed size. Left to the
                // OS font-scale setting, a label two or three steps up turns a
                // 52pt button into a block half the screen tall.
                maxFontSizeMultiplier={1.2}
              >
                {label}
              </Text>
            </View>
          );
        }}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HIT_SIZE,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  large: { minHeight: 68 },
  disabled: { opacity: 0.35 },
  inner: {
    // Deliberately not `flex: 1`. Growing to fill the Pressable made the
    // button's height whatever its parent happened to offer, which is how a
    // secondary action ended up as tall as the screen.
    alignSelf: 'stretch',
    minHeight: HIT_SIZE - stroke.thick * 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: stroke.hair,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerLarge: { minHeight: 68 - stroke.thick * 2 },
  // No fontFamily: the emoji is left to the system face on purpose, and the
  // line box is pinned so a tall fallback glyph cannot stretch the row.
  icon: { fontSize: 16, lineHeight: 20 },
  label: { ...type.label, textAlign: 'center', textTransform: 'uppercase', flexShrink: 1 },
  labelLarge: { ...type.heading, textAlign: 'center', textTransform: 'uppercase' },
});
