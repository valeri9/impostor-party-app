import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSkinTokens } from '../theme/SkinContext';
import { spacing, stroke, type } from '../theme/tokens';

type Props = {
  name: string;
  /** Ordinal shown in the leading badge. */
  index?: number;
  accent?: string;
  /** Dims players who have already had their turn. */
  done?: boolean;
  active?: boolean;
  trailing?: React.ReactNode;
};

/** The active row inverts to ink, the way an 8-bit menu marked its cursor. */
export function PlayerChip({ name, index, accent, done, active, trailing }: Props) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accentColor = accent ?? colors.onSurface;
  const fg = active ? colors.onInk : colors.onSurface;

  return (
    <View
      style={[
        styles.chip,
        { borderColor: accentColor },
        active && { backgroundColor: colors.ink },
        done && styles.done,
      ]}
    >
      {index !== undefined ? (
        <View style={[styles.badge, { borderColor: fg }]}>
          <Text style={[styles.badgeText, { color: fg }]}>{index}</Text>
        </View>
      ) : null}
      <Text style={[styles.name, { color: fg }]} numberOfLines={1}>
        {active ? `▸ ${name}` : name}
      </Text>
      {trailing}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderWidth: stroke.hair,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
    },
    done: { opacity: 0.45 },
    badge: {
      width: 28,
      height: 28,
      borderWidth: stroke.hair,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { ...type.caption },
    name: { ...type.body, flex: 1 },
  });
}
