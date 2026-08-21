import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { PIXEL_LOCK, PixelArt } from '../components/PixelArt';
import { usePressScale } from '../components/pressAnim';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { useI18n } from '../i18n';
import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { useSkin } from '../theme/SkinContext';
import type { Skin } from '../theme/skins';
import { colors, spacing, stroke, type } from '../theme/tokens';

function formatPrice(priceCents: number, freeLabel: string): string {
  if (priceCents === 0) return freeLabel;
  return `€${(priceCents / 100).toFixed(2)}`;
}

/**
 * The skin catalogue — reachable any time from the setup screen's corner
 * button. Every entry from the registry is listed here, whether or not it's
 * owned, so the shop is one screen even once paid skins exist alongside the
 * free default.
 */
export function SkinsScreen({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const { skins, activeSkin, isOwned, setActiveSkin } = useSkin();

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('skins.title')}</Text>
      <Text style={styles.intro}>{t('skins.intro')}</Text>

      <SectionLabel label={t('skins.available')} />
      {skins.map((skin) => (
        <SkinCard
          key={skin.id}
          skin={skin}
          active={skin.id === activeSkin.id}
          owned={isOwned(skin.id)}
          onSelect={() => setActiveSkin(skin.id)}
        />
      ))}

      <Button label={t('skins.done')} testID="skins-done" variant="success" large onPress={onDismiss} style={styles.doneButton} />
    </Screen>
  );
}

function SkinCard({
  skin,
  active,
  owned,
  onSelect,
}: {
  skin: Skin;
  active: boolean;
  owned: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const fg = active ? colors.onInk : colors.ink;

  const badge = active ? t('skins.active') : owned ? t('skins.owned') : formatPrice(skin.priceCents, t('skins.free'));

  if (!owned) {
    return (
      <View style={[styles.card, styles.cardLocked]}>
        <PixelArt rows={PIXEL_LOCK} size={22} color={colors.inkSoft} />
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{t(skin.nameKey)}</Text>
        </View>
        <Text style={styles.cardBadge}>{badge}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID={`skin-${skin.id}`}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          if (active) return;
          haptics.selection();
          playSound('tick');
          onSelect();
        }}
        style={[styles.card, active && styles.cardActive]}
      >
        <Text style={[styles.cardGlyph, { color: fg }]}>{active ? '▸' : ' '}</Text>
        <View style={styles.cardText}>
          <Text style={[styles.cardName, { color: fg }]}>{t(skin.nameKey)}</Text>
        </View>
        <Text style={[styles.cardBadge, { color: fg }]}>{badge}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.ink,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  intro: { ...type.body, color: colors.ink, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: stroke.hair,
    borderColor: colors.ink,
    marginBottom: spacing.sm,
  },
  cardActive: { backgroundColor: colors.ink, borderWidth: stroke.thin },
  cardLocked: { opacity: 0.55 },
  cardGlyph: { ...type.heading, width: 16 },
  cardText: { flex: 1 },
  cardName: { ...type.label, textTransform: 'uppercase' },
  cardBadge: { ...type.caption, letterSpacing: 0 },
  doneButton: { marginTop: spacing.lg },
});
