import React, { useState } from 'react';
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
import { BEZEL_CAPTION, colors, spacing, stroke, type } from '../theme/tokens';

function formatPrice(priceCents: number, freeLabel: string): string {
  if (priceCents === 0) return freeLabel;
  return `€${(priceCents / 100).toFixed(2)}`;
}

function badgeFor(skin: Skin, active: boolean, owned: boolean, t: (key: string) => string): string {
  if (active) return t('skins.active');
  if (owned) return t('skins.owned');
  return formatPrice(skin.priceCents, t('skins.free'));
}

/**
 * The skin catalogue — reachable any time from the setup screen's corner
 * button. Every entry from the registry is listed here, whether or not it's
 * owned, so the shop is one screen even once paid skins exist alongside the
 * free default. Tapping a skin's thumbnail (or a locked skin's whole card)
 * opens a full-size preview, so nobody buys a skin without seeing it.
 */
export function SkinsScreen({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const { skins, activeSkin, isOwned, setActiveSkin } = useSkin();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const previewSkin = previewId ? skins.find((s) => s.id === previewId) : undefined;
  if (previewSkin) {
    const owned = isOwned(previewSkin.id);
    const active = previewSkin.id === activeSkin.id;
    return (
      <SkinPreviewScreen
        skin={previewSkin}
        owned={owned}
        active={active}
        badge={badgeFor(previewSkin, active, owned, t)}
        onBack={() => setPreviewId(null)}
        onSelect={() => {
          setActiveSkin(previewSkin.id);
          setPreviewId(null);
        }}
      />
    );
  }

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
          onPreview={() => setPreviewId(skin.id)}
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
  onPreview,
}: {
  skin: Skin;
  active: boolean;
  owned: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const { t } = useI18n();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const fg = active ? colors.onInk : colors.ink;
  const badge = badgeFor(skin, active, owned, t);

  if (!owned) {
    return (
      <Pressable
        testID={`skin-preview-${skin.id}`}
        accessibilityRole="button"
        accessibilityLabel={t('skins.preview')}
        onPress={() => {
          haptics.selection();
          playSound('tick');
          onPreview();
        }}
        style={[styles.card, styles.cardLocked]}
      >
        <SkinPreview skin={skin} />
        <PixelArt rows={PIXEL_LOCK} size={18} color={colors.inkSoft} />
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{t(skin.nameKey)}</Text>
        </View>
        <Text style={styles.cardBadge}>{badge}</Text>
      </Pressable>
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
        <Pressable
          testID={`skin-preview-${skin.id}`}
          accessibilityRole="button"
          accessibilityLabel={t('skins.preview')}
          onPress={() => {
            haptics.selection();
            playSound('tick');
            onPreview();
          }}
        >
          <SkinPreview skin={skin} />
        </Pressable>
        <Text style={[styles.cardGlyph, { color: fg }]}>{active ? '▸' : ' '}</Text>
        <View style={styles.cardText}>
          <Text style={[styles.cardName, { color: fg }]}>{t(skin.nameKey)}</Text>
        </View>
        <Text style={[styles.cardBadge, { color: fg }]}>{badge}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * A miniature rendering of the console in this skin's actual colours — the
 * screen's ink bar and one console button. It's the tap target for opening
 * the full preview below, built from the skin's own token values, so any
 * future catalogue entry gets a showcase for free.
 */
function SkinPreview({ skin }: { skin: Skin }) {
  return (
    <View style={[styles.preview, { backgroundColor: skin.shell.bezel }]}>
      <View style={[styles.previewScreen, { backgroundColor: skin.lcd.lightest }]}>
        <View style={[styles.previewInk, { backgroundColor: skin.lcd.darkest }]} />
      </View>
      <View style={[styles.previewButton, { backgroundColor: skin.shell.button, borderColor: skin.shell.buttonDeep }]} />
    </View>
  );
}

/**
 * A full-size, legible mockup of the actual boot screen in a given skin's
 * colours — the same chrome Screen.tsx and SetupScreen's title area draw,
 * rebuilt here so it can be parameterised per-skin without switching the
 * whole app's active skin just to look at one.
 */
function ConsolePreview({ skin }: { skin: Skin }) {
  const { t } = useI18n();
  return (
    <View style={[previewStyles.shell, { backgroundColor: skin.shell.body }]}>
      <View style={[previewStyles.bezel, { backgroundColor: skin.shell.bezel }]}>
        <View style={previewStyles.bezelTop}>
          <View style={[previewStyles.led, { backgroundColor: skin.shell.led }]} />
          <PinstripePair skin={skin} />
          <Text
            style={[previewStyles.caption, { color: skin.shell.caption }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {BEZEL_CAPTION}
          </Text>
          <PinstripePair skin={skin} />
        </View>

        <View style={[previewStyles.lcd, { backgroundColor: skin.lcd.lightest, borderColor: skin.shell.bezelEdge }]}>
          <View style={[previewStyles.titlePlate, { backgroundColor: skin.lcd.darkest }]}>
            <Text
              style={[previewStyles.titleText, { color: skin.lcd.lightest }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t('app.title')}
            </Text>
          </View>
          <View style={previewStyles.buttonRow}>
            <View style={[previewStyles.chip, { backgroundColor: skin.shell.button, borderColor: skin.shell.buttonDeep }]}>
              <Text style={[previewStyles.chipGlyph, { color: skin.shell.onButton }]}>◨</Text>
            </View>
            <Text style={[previewStyles.tagline, { color: skin.lcd.dark }]} numberOfLines={2}>
              {t('app.tagline')}
            </Text>
            <View style={[previewStyles.chip, { backgroundColor: skin.shell.button, borderColor: skin.shell.buttonDeep }]}>
              <Text style={[previewStyles.chipGlyph, { color: skin.shell.onButton }]}>?</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={previewStyles.wordmark}>
        <Text style={[previewStyles.wmSmall, { color: skin.shell.print }]}>Impostor</Text>
        <Text style={[previewStyles.wmLarge, { color: skin.shell.print }]}>PARTY</Text>
      </View>
    </View>
  );
}

function PinstripePair({ skin }: { skin: Skin }) {
  return (
    <View style={previewStyles.stripes}>
      <View style={[previewStyles.stripe, { backgroundColor: skin.shell.stripeMagenta }]} />
      <View style={[previewStyles.stripe, { backgroundColor: skin.shell.stripeNavy }]} />
    </View>
  );
}

function SkinPreviewScreen({
  skin,
  owned,
  active,
  badge,
  onBack,
  onSelect,
}: {
  skin: Skin;
  owned: boolean;
  active: boolean;
  badge: string;
  onBack: () => void;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  return (
    <Screen scroll>
      <Text style={styles.title}>{t(skin.nameKey)}</Text>
      <Text style={[styles.previewBadge, active && styles.previewBadgeActive]}>{badge}</Text>

      <ConsolePreview skin={skin} />

      {owned ? (
        <Button
          testID="skin-preview-select"
          label={active ? t('skins.active') : t('skins.select')}
          variant="success"
          large
          disabled={active}
          onPress={onSelect}
          style={styles.doneButton}
        />
      ) : (
        <Button
          testID="skin-preview-locked"
          label={badge}
          variant="success"
          large
          disabled
          onPress={() => {}}
          style={styles.doneButton}
        />
      )}
      <Button testID="skin-preview-back" label={t('skins.back')} variant="ghost" onPress={onBack} style={styles.backButton} />
    </Screen>
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
  preview: {
    width: 46,
    height: 38,
    padding: 4,
  },
  previewScreen: { flex: 1, justifyContent: 'center', padding: 3 },
  previewInk: { height: 7 },
  previewButton: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 9,
    height: 9,
    borderWidth: 1,
  },
  previewBadge: {
    ...type.label,
    color: colors.inkSoft,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  previewBadgeActive: { color: colors.ink },
  doneButton: { marginTop: spacing.lg },
  backButton: { marginTop: spacing.sm },
});

const previewStyles = StyleSheet.create({
  shell: { padding: spacing.sm, borderRadius: 0 },
  bezel: {
    padding: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomRightRadius: 28,
  },
  bezelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 22,
    marginBottom: spacing.xs,
  },
  led: { width: 7, height: 7, borderRadius: 4 },
  stripes: { flex: 1, gap: 3 },
  stripe: { height: 3 },
  caption: {
    ...type.caption,
    fontSize: 8,
    letterSpacing: 1,
    flexShrink: 0,
  },
  lcd: {
    borderWidth: stroke.hair,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  titlePlate: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  titleText: { ...type.heading, textTransform: 'uppercase' },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    width: 30,
    height: 30,
    borderWidth: stroke.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGlyph: { ...type.label, lineHeight: 20 },
  tagline: {
    ...type.caption,
    flex: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  wmSmall: { ...type.caption, fontSize: 11, letterSpacing: 0 },
  wmLarge: { ...type.caption, fontSize: 15, fontStyle: 'italic', letterSpacing: 1 },
});
