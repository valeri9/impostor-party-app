import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { haptics } from '../native/haptics';
import { colors, radii, spacing, type } from '../theme/tokens';

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    haptics.selection();
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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.stepButton,
        pressed && !disabled && { backgroundColor: colors.indigo },
        disabled && styles.stepDisabled,
      ]}
    >
      <Text style={styles.stepGlyph}>{glyph}</Text>
    </Pressable>
  );
}

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
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          haptics.selection();
          onChange(next);
        }}
        trackColor={{ false: colors.surfaceAlt, true: colors.emeraldDark }}
        thumbColor={value ? colors.emerald : colors.textFaint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  rowDisabled: { opacity: 0.45 },
  label: { ...type.label, color: colors.text, flexShrink: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  stepGlyph: { ...type.heading, color: colors.text, lineHeight: 26 },
  value: { ...type.heading, color: colors.text, minWidth: 32, textAlign: 'center' },
});
