import React, { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { useSkinTokens } from '../theme/SkinContext';
import { spacing, stroke, type } from '../theme/tokens';
import { usePressScale } from './pressAnim';

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    haptics.selection();
    playSound('tick');
    onChange(next);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <StepButton glyph="−" onPress={() => step(-1)} disabled={value <= min} />
        <Text style={styles.value}>{value}</Text>
        <StepButton glyph="+" onPress={() => step(1)} disabled={value >= max} />
      </View>
    </View>
  );
}

function StepButton({ glyph, onPress, disabled }: { glyph: string; onPress: () => void; disabled: boolean }) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.stepButton,
          pressed && !disabled && { backgroundColor: colors.ink },
          disabled && styles.stepDisabled,
        ]}
      >
        {({ pressed }) => (
          <Text style={[styles.stepGlyph, pressed && !disabled && { color: colors.onInk }]}>{glyph}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * A 1-bit switch: the hardware had no toggles, so this reads as an on-screen
 * option box with the chosen half inverted.
 */
export function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled: !!disabled }}
          accessibilityLabel={label}
          disabled={disabled}
          onPressIn={disabled ? undefined : onPressIn}
          onPressOut={onPressOut}
          onPress={() => {
            haptics.selection();
            playSound('tick');
            onChange(!value);
          }}
          style={styles.toggle}
        >
          <View style={[styles.toggleHalf, value && styles.toggleHalfOn]}>
            <Text style={[styles.toggleText, value && styles.toggleTextOn]}>ON</Text>
          </View>
          <View style={[styles.toggleHalf, !value && styles.toggleHalfOn]}>
            <Text style={[styles.toggleText, !value && styles.toggleTextOn]}>OFF</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      minHeight: 56,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.onSurface,
      marginBottom: spacing.sm,
    },
    rowDisabled: { opacity: 0.4 },
    label: { ...type.label, color: colors.onSurface, flexShrink: 1, textTransform: 'uppercase' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    stepButton: {
      width: 44,
      height: 44,
      borderWidth: stroke.hair,
      borderColor: colors.onSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDisabled: { opacity: 0.3 },
    stepGlyph: { ...type.heading, color: colors.onSurface, lineHeight: 24 },
    value: { ...type.heading, color: colors.onSurface, minWidth: 32, textAlign: 'center' },
    toggle: { flexDirection: 'row', borderWidth: stroke.hair, borderColor: colors.onSurface },
    toggleHalf: {
      minWidth: 46,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    toggleHalfOn: { backgroundColor: colors.ink },
    toggleText: { ...type.caption, color: colors.onSurface },
    toggleTextOn: { color: colors.onInk },
  });
}
