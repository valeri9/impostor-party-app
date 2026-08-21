import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BeachScene } from './BeachScene';
import { useSkin, useSkinTokens } from '../theme/SkinContext';
import { BEZEL_CAPTION, PIXEL_FONT, spacing, stroke, type } from '../theme/tokens';

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
 * Every screen is drawn as the handheld itself: grey plastic, the purple bezel
 * with its pinstripes and printed caption, the dot-matrix LCD recessed into it,
 * and the wordmark below. Only the LCD is 1-bit green; the console is not.
 */
export function Screen({ children, scroll = false, center = false, style, background, testID }: Props) {
  const insets = useSafeAreaInsets();
  const { activeSkin } = useSkin();
  const { colors, SHELL } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors, SHELL), [colors, SHELL]);
  const shellPadding = {
    paddingTop: insets.top + spacing.sm,
    paddingBottom: insets.bottom + spacing.xs,
    paddingLeft: insets.left + spacing.sm,
    paddingRight: insets.right + spacing.sm,
  };
  const panelTint = background ? { backgroundColor: background } : null;

  return (
    <View testID={testID} style={[styles.shell, shellPadding]}>
      <View style={styles.bezel}>
        <View style={styles.bezelTop}>
          <View style={styles.led} />
          <Pinstripes />
          <Text style={styles.caption} numberOfLines={1} adjustsFontSizeToFit>
            {BEZEL_CAPTION}
          </Text>
          <Pinstripes />
        </View>

        <View style={[styles.lcd, panelTint]}>
          {activeSkin.sceneId === 'shoreline' ? (
            // A fixed backdrop, not scrollable content: it sits behind the
            // ScrollView as a sibling rather than inside it, so it stays put
            // — the same way DotMatrix always has — while everything else
            // scrolls over it, on every screen that uses Screen at all.
            <View style={[StyleSheet.absoluteFill, { backgroundColor: SHELL.body }]} pointerEvents="none">
              <BeachScene />
            </View>
          ) : (
            <DotMatrix />
          )}
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
      </View>

      {/* The wordmark printed under the screen, set like the console's own. */}
      <View style={styles.wordmark}>
        <Text style={styles.wordmarkSmall}>Impostor</Text>
        <Text style={styles.wordmarkLarge}>PARTY</Text>
      </View>
    </View>
  );
}

/** The magenta-over-navy pair printed either side of the bezel caption. */
function Pinstripes() {
  const { SHELL } = useSkinTokens();
  return (
    <View style={pinstripeStyles.stripes}>
      <View style={[pinstripeStyles.stripe, { backgroundColor: SHELL.stripeMagenta }]} />
      <View style={[pinstripeStyles.stripe, { backgroundColor: SHELL.stripeNavy }]} />
    </View>
  );
}

/**
 * The pixel grid of the LCD. It sits behind the content rather than over it so
 * it can never intercept a touch — the drawing canvas depends on that.
 */
function DotMatrix() {
  const { LCD } = useSkinTokens();
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

const pinstripeStyles = StyleSheet.create({
  stripes: { flex: 1, gap: 3 },
  stripe: { height: 3 },
});

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors'], SHELL: ReturnType<typeof useSkinTokens>['SHELL']) {
  return StyleSheet.create({
    shell: { flex: 1, backgroundColor: SHELL.body },
    bezel: {
      flex: 1,
      backgroundColor: SHELL.bezel,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      // The one curve on the whole console, and it is on the plastic.
      borderBottomRightRadius: 34,
    },
    bezelTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      height: 26,
    },
    led: { width: 8, height: 8, borderRadius: 4, backgroundColor: SHELL.led },
    caption: {
      fontFamily: PIXEL_FONT,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: SHELL.caption,
      flexShrink: 0,
    },
    lcd: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: stroke.hair,
      borderColor: SHELL.bezelEdge,
      overflow: 'hidden',
      // Matches the bezel's own curve (radius, less the bezel's own padding
      // inset) — without it, this square corner pokes a dark wedge through
      // the rounded bezel right where the two corners don't line up.
      borderBottomRightRadius: 26,
    },
    content: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
    fill: { flex: 1 },
    center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    wordmark: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingTop: spacing.xs,
    },
    wordmarkSmall: { ...type.caption, fontSize: 11, lineHeight: 15, color: SHELL.print, letterSpacing: 0 },
    // No fontStyle: 'italic' here on purpose: PIXEL_FONT has no real italic
    // face on Android, so the OS fakes one by shearing each glyph — but it
    // still measures the *upright* width and clips paint to that box, so the
    // slanted last letter's overhang gets cut clean off. A skew transform on
    // the whole word slants it the same way without that per-glyph clipping.
    wordmarkLarge: {
      ...type.caption,
      fontSize: 15,
      lineHeight: 20,
      color: SHELL.print,
      letterSpacing: 1,
      transform: [{ skewX: '-12deg' }],
      paddingRight: 4,
    },
  });
}
