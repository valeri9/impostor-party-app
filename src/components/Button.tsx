import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { HIT_SIZE, SHELL, spacing, stroke, type } from '../theme/tokens';
import { usePressScale } from './pressAnim';

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
 * Buttons are hardware, not screen content, so they are moulded in the
 * console's own colours: the crimson of the A/B buttons for the affirmative
 * actions, the navy of the printed labels for the ones that end a round.
 */
const VARIANTS: Record<
  ButtonVariant,
  {
    fill: string;
    pressedFill: string;
    border: string;
    label: string;
    pressedLabel: string;
    /** A second inner line, for the loudest actions on a screen. */
    doubleFrame: boolean;
    width: number;
  }
> = {
  primary: {
    fill: SHELL.button,
    pressedFill: SHELL.buttonDeep,
    border: SHELL.buttonDeep,
    label: SHELL.onButton,
    pressedLabel: SHELL.onButton,
    doubleFrame: false,
    width: stroke.thin,
  },
  success: {
    fill: SHELL.button,
    pressedFill: SHELL.buttonDeep,
    border: SHELL.buttonDeep,
    label: SHELL.onButton,
    pressedLabel: SHELL.onButton,
    doubleFrame: true,
    width: stroke.thick,
  },
  danger: {
    fill: SHELL.print,
    pressedFill: SHELL.printDeep,
    border: SHELL.printDeep,
    label: SHELL.onButton,
    pressedLabel: SHELL.onButton,
    doubleFrame: true,
    width: stroke.thick,
  },
  ghost: {
    fill: 'transparent',
    pressedFill: SHELL.print,
    border: SHELL.print,
    label: SHELL.print,
    pressedLabel: SHELL.onButton,
    doubleFrame: false,
    width: stroke.hair,
  },
};

export function Button({ label, onPress, variant = 'primary', disabled, large, style, testID }: Props) {
  const spec = VARIANTS[variant];
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
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
          style,
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
              <Text style={[styles.label, large && styles.labelLarge, { color: fg }]} numberOfLines={2}>
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
