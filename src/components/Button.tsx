import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { haptics } from '../native/haptics';
import { colors, HIT_SIZE, radii, spacing, type } from '../theme/tokens';

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

const FILLS: Record<ButtonVariant, { bg: string; pressed: string; text: string; border?: string }> = {
  primary: { bg: colors.indigo, pressed: colors.indigoDark, text: colors.onAccent },
  success: { bg: colors.emerald, pressed: colors.emeraldDark, text: colors.onAccent },
  danger: { bg: colors.rose, pressed: colors.roseDark, text: colors.onAccent },
  ghost: { bg: 'transparent', pressed: colors.surfaceAlt, text: colors.textMuted, border: colors.border },
};

export function Button({ label, onPress, variant = 'primary', disabled, large, style, testID }: Props) {
  const fill = FILLS[variant];

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
          backgroundColor: pressed ? fill.pressed : fill.bg,
          borderColor: fill.border ?? 'transparent',
          borderWidth: fill.border ? 2 : 0,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View pointerEvents="none">
        <Text style={[styles.label, large && styles.labelLarge, { color: fill.text }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HIT_SIZE,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: 68, borderRadius: radii.lg },
  disabled: { opacity: 0.4 },
  label: { ...type.label, textAlign: 'center' },
  labelLarge: { ...type.heading, textAlign: 'center', letterSpacing: 0.5 },
});
