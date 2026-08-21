import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSkinTokens } from '../theme/SkinContext';
import { spacing, type } from '../theme/tokens';

/**
 * A menu section header. The solid block is the marker an 8-bit menu used, and
 * it is a separate node so the label itself stays exactly the translated text.
 */
export function SectionLabel({ label, style }: { label: string; style?: object }) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.mark}>█</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    mark: { ...type.caption, color: colors.ink },
    label: { ...type.caption, color: colors.ink, textTransform: 'uppercase' },
  });
}
