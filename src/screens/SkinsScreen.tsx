import React, { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { PIXEL_LOCK, PixelArt } from '../components/PixelArt';
import { usePressScale } from '../components/pressAnim';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { useGame } from '../game/GameContext';
import { GAME_MODES } from '../game/types';
import { LOCALES, useI18n } from '../i18n';
import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { useSkin } from '../theme/SkinContext';
import type { Skin } from '../theme/skins';
import { BEZEL_CAPTION, colors, deriveColors, HIT_SIZE, MODE_GLYPH, spacing, stroke, type } from '../theme/tokens';

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

function MiniSectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <View style={previewStyles.sectionRow}>
      <Text style={[previewStyles.sectionMark, { color }]}>█</Text>
      <Text style={[previewStyles.sectionLabel, { color }]}>{label}</Text>
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

/**
 * A button styled entirely from a given skin's own colours, for the two real
 * controls (select / back) on the preview screen. The app's real Button
 * component reads static default-skin colours, which would look wrong sitting
 * on a screen that's otherwise fully dressed in the previewed skin.
 */
function PreviewActionButton({
  label,
  skin,
  disabled,
  ghost,
  onPress,
  testID,
}: {
  label: string;
  skin: Skin;
  disabled?: boolean;
  ghost?: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={() => {
          if (disabled) return;
          playSound('click');
          haptics.light();
          onPressIn();
        }}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        style={({ pressed }) => [
          previewStyles.actionButton,
          ghost
            ? { borderColor: skin.shell.print, backgroundColor: pressed ? skin.shell.print : 'transparent' }
            : { backgroundColor: pressed ? skin.shell.buttonDeep : skin.shell.button, borderColor: skin.shell.buttonDeep },
          disabled && previewStyles.actionDisabled,
        ]}
      >
        {({ pressed }) => (
          <Text
            style={[
              previewStyles.actionLabel,
              { color: ghost ? (pressed ? skin.shell.onButton : skin.shell.print) : skin.shell.onButton },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * A full-size, standalone preview of the *entire* home screen in a given
 * skin's colours — its own bezel, screen and wordmark, not nested inside the
 * app's real (always-default-skin) console chrome, so there's only ever one
 * console on screen and it's genuinely the previewed skin throughout, not a
 * previewed skin's mockup sitting inside the real default one. Everything
 * below the bezel mirrors what SetupScreen actually draws — language row,
 * current player list, mode cards, start button — using live game/locale
 * state so it's not a placeholder page. Every piece of that content is inert
 * (plain View/Text, never a Pressable): this is a look, not a second setup
 * screen to interact with. Only the select/back controls at the bottom are
 * real.
 */
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
  const { t, locale } = useI18n();
  const { state } = useGame();
  const insets = useSafeAreaInsets();
  const c = deriveColors(skin.lcd);

  return (
    <View
      style={[
        previewStyles.page,
        {
          backgroundColor: skin.shell.body,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xs,
          paddingLeft: insets.left + spacing.sm,
          paddingRight: insets.right + spacing.sm,
        },
      ]}
    >
      <View style={previewStyles.header}>
        <Text style={[previewStyles.headerName, { color: skin.shell.print }]}>{t(skin.nameKey)}</Text>
        <Text style={[previewStyles.headerBadge, active && { color: skin.shell.print }, { color: active ? skin.shell.print : skin.shell.caption }]}>
          {badge}
        </Text>
      </View>

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

        <View style={[previewStyles.lcd, { backgroundColor: c.bg, borderColor: skin.shell.bezelEdge }]}>
          <ScrollView contentContainerStyle={previewStyles.lcdContent} showsVerticalScrollIndicator={false}>
            <View style={[previewStyles.titlePlate, { backgroundColor: c.ink }]}>
              <Text style={[previewStyles.titleText, { color: c.onInk }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('app.title')}
              </Text>
            </View>
            <View style={previewStyles.buttonRow}>
              <View style={[previewStyles.chip, { backgroundColor: skin.shell.button, borderColor: skin.shell.buttonDeep }]}>
                <Text style={[previewStyles.chipGlyph, { color: skin.shell.onButton }]}>◨</Text>
              </View>
              <Text style={[previewStyles.tagline, { color: c.inkSoft }]} numberOfLines={2}>
                {t('app.tagline')}
              </Text>
              <View style={[previewStyles.chip, { backgroundColor: skin.shell.button, borderColor: skin.shell.buttonDeep }]}>
                <Text style={[previewStyles.chipGlyph, { color: skin.shell.onButton }]}>?</Text>
              </View>
            </View>

            <MiniSectionLabel label={t('setup.language')} color={c.ink} />
            <View style={previewStyles.langRow}>
              {LOCALES.map((code) => {
                const localeActive = code === locale;
                return (
                  <View
                    key={code}
                    style={[
                      previewStyles.langPill,
                      { borderColor: c.ink, backgroundColor: localeActive ? c.ink : c.surface },
                    ]}
                  >
                    <Text style={[previewStyles.langCode, { color: localeActive ? c.onInk : c.ink }]}>{code}</Text>
                  </View>
                );
              })}
            </View>

            <MiniSectionLabel label={`${t('setup.players')}  (${state.players.length})`} color={c.ink} />
            {state.players.map((p, i) => (
              <View key={p.id} style={previewStyles.playerRow}>
                <View style={[previewStyles.playerIndex, { borderColor: c.ink }]}>
                  <Text style={[previewStyles.playerIndexText, { color: c.ink }]}>{i + 1}</Text>
                </View>
                <View style={[previewStyles.playerInput, { borderColor: c.ink, backgroundColor: c.surface }]}>
                  <Text style={[previewStyles.playerName, { color: c.ink }]} numberOfLines={1}>
                    {p.name || t('setup.playerPlaceholder', { n: i + 1 })}
                  </Text>
                </View>
              </View>
            ))}

            <MiniSectionLabel label={t('setup.chooseMode')} color={c.ink} />
            {GAME_MODES.map((m) => {
              const selected = m === state.mode;
              const fg = selected ? c.onInk : c.ink;
              return (
                <View
                  key={m}
                  style={[previewStyles.modeCard, { borderColor: c.ink, backgroundColor: selected ? c.ink : c.surface }]}
                >
                  <Text style={[previewStyles.modeGlyph, { color: fg }]}>{MODE_GLYPH[m]}</Text>
                  <Text style={[previewStyles.modeName, { color: fg }]}>{t(`mode.${m}.name`)}</Text>
                </View>
              );
            })}

            <View style={[previewStyles.startButton, { backgroundColor: skin.shell.button, borderColor: skin.shell.buttonDeep }]}>
              <Text style={[previewStyles.startLabel, { color: skin.shell.onButton }]}>{t('setup.start')}</Text>
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={previewStyles.wordmark}>
        <Text style={[previewStyles.wmSmall, { color: skin.shell.print }]}>Impostor</Text>
        <Text style={[previewStyles.wmLarge, { color: skin.shell.print }]}>PARTY</Text>
      </View>

      <View style={previewStyles.controls}>
        {owned ? (
          <PreviewActionButton
            testID="skin-preview-select"
            label={active ? t('skins.active') : t('skins.select')}
            skin={skin}
            disabled={active}
            onPress={onSelect}
          />
        ) : (
          <PreviewActionButton testID="skin-preview-locked" label={badge} skin={skin} disabled onPress={() => {}} />
        )}
        <PreviewActionButton testID="skin-preview-back" label={t('skins.back')} skin={skin} ghost onPress={onBack} />
      </View>
    </View>
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
  doneButton: { marginTop: spacing.lg },
});

const previewStyles = StyleSheet.create({
  page: { flex: 1 },
  header: { marginBottom: spacing.sm },
  headerName: { ...type.heading, textAlign: 'center', textTransform: 'uppercase' },
  headerBadge: { ...type.caption, textAlign: 'center', marginTop: 2 },
  bezel: {
    flex: 1,
    padding: spacing.sm,
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
    lineHeight: 11,
    letterSpacing: 1,
    flexShrink: 0,
  },
  lcd: {
    flex: 1,
    borderWidth: stroke.hair,
    overflow: 'hidden',
    // Matches the bezel's own curve, same fix as Screen.tsx's lcd — a
    // square-cornered bordered child inside a rounded parent otherwise
    // pokes a dark wedge through right at the curve.
    borderBottomRightRadius: 20,
  },
  lcdContent: { padding: spacing.sm },
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
    paddingVertical: spacing.xs,
  },
  // Explicit lineHeight here, not inherited from type.caption's (tuned for
  // fontSize 12) — at fontSize 15 that 16px line box was too tight for the
  // italic's rightward slant and clipped the last glyph outright.
  wmSmall: { ...type.caption, fontSize: 11, lineHeight: 15, letterSpacing: 0 },
  wmLarge: { ...type.caption, fontSize: 15, lineHeight: 20, fontStyle: 'italic', letterSpacing: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.xs },
  sectionMark: { ...type.caption, fontSize: 10 },
  sectionLabel: { ...type.caption, fontSize: 10, textTransform: 'uppercase' },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  langPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderWidth: stroke.hair,
  },
  langCode: { ...type.caption, fontSize: 9, textTransform: 'uppercase' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  playerIndex: {
    width: 20,
    height: 20,
    borderWidth: stroke.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerIndexText: { ...type.caption, fontSize: 9 },
  playerInput: {
    flex: 1,
    minHeight: 24,
    justifyContent: 'center',
    borderWidth: stroke.hair,
    paddingHorizontal: spacing.xs,
  },
  playerName: { ...type.caption, fontSize: 10, letterSpacing: 0 },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderWidth: stroke.hair,
    marginBottom: spacing.xs,
  },
  modeGlyph: { ...type.caption, fontSize: 12 },
  modeName: { ...type.caption, fontSize: 10, textTransform: 'uppercase' },
  startButton: {
    marginTop: spacing.sm,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.thin,
  },
  startLabel: { ...type.label, fontSize: 12, textTransform: 'uppercase' },
  controls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionButton: {
    flex: 1,
    minHeight: HIT_SIZE,
    borderWidth: stroke.thin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionDisabled: { opacity: 0.35 },
  actionLabel: { ...type.label, textAlign: 'center', textTransform: 'uppercase' },
});
