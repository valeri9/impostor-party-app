import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { PIXEL_LOCK, PixelArt } from '../components/PixelArt';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { GAME_MODES } from '../game/types';
import { useI18n } from '../i18n';
import { useSkinTokens } from '../theme/SkinContext';
import { MODE_GLYPH, spacing, stroke, type } from '../theme/tokens';

/**
 * Shown automatically the first time the app is opened, and reachable any
 * time after from the setup screen's corner button. Explains the one rule
 * that matters (hold to reveal, don't let anyone else see) and previews the
 * four modes — nothing here is game state, so it lives outside the reducer.
 */
export function HowToPlayScreen({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('howto.title')}</Text>
      <Text style={styles.intro}>{t('howto.intro')}</Text>

      <SectionLabel label={t('howto.holdTitle')} />
      <View style={styles.holdRow}>
        <View style={styles.lockBadge}>
          <PixelArt rows={PIXEL_LOCK} size={40} color={colors.onInk} />
        </View>
        <Text style={styles.holdBody}>{t('howto.holdBody')}</Text>
      </View>

      <SectionLabel label={t('howto.modesTitle')} />
      {GAME_MODES.map((m) => (
        <View key={m} style={styles.modeRow}>
          <Text style={styles.modeGlyph}>{MODE_GLYPH[m]}</Text>
          <View style={styles.modeText}>
            <Text style={styles.modeName}>{t(`mode.${m}.name`)}</Text>
            <Text style={styles.modeDesc}>{t(`mode.${m}.desc`)}</Text>
          </View>
        </View>
      ))}

      <Button
        label={t('howto.done')}
        testID="howto-done"
        variant="success"
        large
        onPress={onDismiss}
        style={styles.doneButton}
      />
    </Screen>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    title: {
      ...type.title,
      color: colors.ink,
      textAlign: 'center',
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    intro: { ...type.body, color: colors.ink, textAlign: 'center' },
    holdRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
      padding: spacing.md,
    },
    lockBadge: { backgroundColor: colors.ink, padding: spacing.sm },
    holdBody: { ...type.body, color: colors.ink, flex: 1 },
    modeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
      marginBottom: spacing.sm,
    },
    modeGlyph: { ...type.heading, color: colors.ink },
    modeText: { flex: 1 },
    modeName: { ...type.label, color: colors.ink, textTransform: 'uppercase' },
    modeDesc: { ...type.caption, color: colors.inkSoft, marginTop: 3, letterSpacing: 0 },
    doneButton: { marginTop: spacing.lg },
  });
}
