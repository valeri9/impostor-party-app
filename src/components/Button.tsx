import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { haptics } from '../native/haptics';
import { colors, HIT_SIZE, spacing, stroke, type } from '../theme/tokens';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Oversized target for the game's headline actions. */
  large?: boolean;
  style?: ViewStyle;
  testID?: string;
};

/**
 * With one ink colour to spend, weight does the work a hue used to: filled vs
 * hollow, single vs double frame. Pressing inverts the block, which is how an
 * 8-bit menu acknowledged a press.
 */
const VARIANTS: Record<ButtonVariant, { filled: boolean; doubleFrame: boolean; border: number }> = {
  primary: { filled: true, doubleFrame: false, border: stroke.thin },
  success: { filled: true, doubleFrame: true, border: stroke.thick },
  danger: { filled: false, doubleFrame: true, border: stroke.thick },
  ghost: { filled: false, doubleFrame: false, border: stroke.hair },
};

export function Button({ label, onPress, variant = 'primary', disabled, large, style, testID }: Props) {
  const spec = VARIANTS[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        {
          backgroundColor: spec.filled !== pressed ? colors.ink : colors.bg,
          borderWidth: spec.border,
          borderColor: colors.ink,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {({ pressed }) => {
        // `filled !== pressed` is the inversion: a filled button empties when
        // pressed, a hollow one fills.
        const inked = spec.filled !== pressed;
        const fg = inked ? colors.onInk : colors.ink;
        return (
          <View
            pointerEvents="none"
            style={[
              styles.inner,
              large && styles.innerLarge,
              spec.doubleFrame && { borderWidth: stroke.hair, borderColor: fg },
            ]}
          >
            <Text style={[styles.label, large && styles.labelLarge, { color: fg }]} numberOfLines={2}>
              {label}
            </Text>
          </View>
        );
      }}
    </Pressable>
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
    flex: 1,
    minHeight: HIT_SIZE - stroke.thick * 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: stroke.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerLarge: { minHeight: 68 - stroke.thick * 2 },
  label: { ...type.label, textAlign: 'center', textTransform: 'uppercase' },
  labelLarge: { ...type.heading, textAlign: 'center', textTransform: 'uppercase' },
});
