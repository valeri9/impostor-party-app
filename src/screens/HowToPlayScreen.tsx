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
        <View key={m} style={styles.modeCard}>
          <View style={styles.modeHeader}>
            <Text style={styles.modeGlyph}>{MODE_GLYPH[m]}</Text>
            <Text style={styles.modeName}>{t(`mode.${m}.name`)}</Text>
          </View>
          <Text style={styles.modeRules}>{t(`mode.${m}.rules`)}</Text>
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
      borderColor: colors.onSurface,
      padding: spacing.md,
    },
    lockBadge: { backgroundColor: colors.ink, padding: spacing.sm },
    holdBody: { ...type.body, color: colors.onSurface, flex: 1 },
    modeCard: {
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.onSurface,
      marginBottom: spacing.sm,
    },
    modeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    modeGlyph: { ...type.heading, color: colors.onSurface },
    modeName: { ...type.label, color: colors.onSurface, textTransform: 'uppercase', flex: 1 },
    modeRules: { ...type.body, color: colors.onSurface },
    doneButton: { marginTop: spacing.lg },
  });
}
