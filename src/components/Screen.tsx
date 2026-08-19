import React from 'react';
import { ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BEZEL_CAPTION, colors, LCD, spacing, stroke, type } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  /** Scrollable for form-like screens; fixed for gameplay screens. */
  scroll?: boolean;
  center?: boolean;
  style?: ViewStyle;
  /** Tints the screen panel — used to make each mode feel distinct. */
  background?: string;
  testID?: string;
};

/**
 * Every screen is drawn as the handheld itself: a dark plastic shell with the
 * printed caption below, and a dot-matrix LCD panel recessed into it.
 */
export function Screen({ children, scroll = false, center = false, style, background, testID }: Props) {
  const insets = useSafeAreaInsets();
  const shellPadding = {
    paddingTop: insets.top + spacing.sm,
    paddingBottom: insets.bottom + spacing.xs,
    paddingLeft: insets.left + spacing.sm,
    paddingRight: insets.right + spacing.sm,
  };
  const panelTint = background ? { backgroundColor: background } : null;

  return (
    <View testID={testID} style={[styles.shell, shellPadding]}>
      <View style={[styles.panel, panelTint]}>
        <DotMatrix />
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, center && styles.center, style]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill, center && styles.center, style]}>{children}</View>
        )}
      </View>
      <Text style={styles.caption} numberOfLines={1}>
        {BEZEL_CAPTION}
      </Text>
    </View>
  );
}

/**
 * The pixel grid of the LCD. It sits behind the content rather than over it so
 * it can never intercept a touch — the drawing canvas depends on that.
 */
function DotMatrix() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="dots" width={4} height={4} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={4} height={4} fill="none" />
            <Rect x={3} y={0} width={1} height={4} fill={LCD.light} opacity={0.5} />
            <Rect x={0} y={3} width={4} height={1} fill={LCD.light} opacity={0.5} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#dots)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.shell },
  panel: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: stroke.thin,
    borderColor: colors.shellEdge,
    overflow: 'hidden',
  },
  content: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  fill: { flex: 1 },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  caption: {
    ...type.caption,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.shellText,
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
});
