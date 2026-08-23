import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { useI18n } from '../i18n';
import { useSkinTokens } from '../theme/SkinContext';
import { spacing, stroke, type } from '../theme/tokens';

const SECTIONS = ['collect', 'storage', 'permissions', 'purchases', 'contact'] as const;

/**
 * Reachable from the setup screen's Privacy Policy link. Its text is the
 * source of truth mirrored into the public Play Console policy URL — keep
 * the two in sync if this ever changes.
 */
export function PrivacyScreen({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('privacy.title')}</Text>
      <Text style={styles.intro}>{t('privacy.intro')}</Text>

      {SECTIONS.map((section) => (
        <View key={section}>
          <SectionLabel label={t(`privacy.${section}Title`)} />
          <View style={styles.card}>
            <Text style={styles.body}>{t(`privacy.${section}Body`)}</Text>
          </View>
        </View>
      ))}

      <Button
        label={t('skins.done')}
        testID="privacy-done"
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
    card: {
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.onSurface,
    },
    body: { ...type.body, color: colors.onSurface },
    doneButton: { marginTop: spacing.lg },
  });
}
