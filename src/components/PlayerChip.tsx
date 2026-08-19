import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/tokens';

type Props = {
  name: string;
  /** Ordinal shown in the leading circle. */
  index?: number;
  accent?: string;
  /** Dims players who have already had their turn. */
  done?: boolean;
  active?: boolean;
  trailing?: React.ReactNode;
};

export function PlayerChip({ name, index, accent = colors.indigo, done, active, trailing }: Props) {
  return (
    <View
      style={[
        styles.chip,
        active && { borderColor: accent, backgroundColor: colors.surfaceAlt },
        done && styles.done,
      ]}
    >
      {index !== undefined ? (
        <View style={[styles.badge, { backgroundColor: active ? accent : colors.surfaceAlt }]}>
          <Text style={styles.badgeText}>{index}</Text>
        </View>
      ) : null}
      <Text style={[styles.name, active && { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  done: { opacity: 0.45 },
  badge: { width: 30, height: 30, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...type.caption, color: colors.text },
  name: { ...type.body, color: colors.textMuted, flex: 1 },
});
