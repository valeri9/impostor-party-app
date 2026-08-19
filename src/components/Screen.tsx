import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  /** Scrollable for form-like screens; fixed for gameplay screens. */
  scroll?: boolean;
  center?: boolean;
  style?: ViewStyle;
  /** Tints the whole screen — used to make each mode feel distinct. */
  background?: string;
  testID?: string;
};

export function Screen({ children, scroll = false, center = false, style, background, testID }: Props) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.md,
    paddingBottom: insets.bottom + spacing.md,
    paddingLeft: insets.left + spacing.lg,
    paddingRight: insets.right + spacing.lg,
  };

  if (scroll) {
    return (
      <View testID={testID} style={[styles.root, background ? { backgroundColor: background } : null]}>
        <ScrollView
          contentContainerStyle={[padding, center && styles.center, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        padding,
        center && styles.center,
        background ? { backgroundColor: background } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});
