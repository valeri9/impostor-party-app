import React, { useCallback, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BeachScene, SandFill } from '../components/BeachScene';
import { Button } from '../components/Button';
import { PIXEL_LOCK, PixelArt } from '../components/PixelArt';
import { usePressScale } from '../components/pressAnim';
import { DotMatrix, Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { useGame } from '../game/GameContext';
import { GAME_MODES } from '../game/types';
import { LOCALES, useI18n } from '../i18n';
import { haptics } from '../native/haptics';
import { useSkinPurchases, type SkinPurchases } from '../native/iap';
import { playSound } from '../native/sound';
import { useSkin, useSkinTokens } from '../theme/SkinContext';
import type { Skin } from '../theme/skins';
import { BEZEL_CAPTION, deriveColors, HIT_SIZE, MODE_GLYPH, spacing, stroke, type } from '../theme/tokens';

/** Display-only fallback for before the real store price loads, and on
 *  platforms with no store (web) — see `Skin.priceCents`. */
function fallbackPrice(priceCents: number, freeLabel: string): string {
  if (priceCents === 0) return freeLabel;
  return `€${(priceCents / 100).toFixed(2)}`;
}

/** The real, localized store price once loaded; the fallback until then. */
function priceFor(skin: Skin, livePrices: Record<string, string>, freeLabel: string): string {
  if (skin.priceCents === 0) return freeLabel;
  const live = skin.productId ? livePrices[skin.productId] : undefined;
  return live ?? fallbackPrice(skin.priceCents, freeLabel);
}

function badgeFor(skin: Skin, active: boolean, owned: boolean, livePrices: Record<string, string>, t: (key: string) => string): string {
  if (active) return t('skins.active');
  if (owned) return t('skins.owned');
  return priceFor(skin, livePrices, t('skins.free'));
}

/**
 * The skin catalogue — reachable any time from the setup screen's corner
 * button. Every entry from the registry is listed here, whether or not it's
 * owned, so the shop is one screen even once paid skins exist alongside the
 * free default.
 *
 * Two different actions, kept deliberately distinct rather than layered on
 * one ambiguous tap target: an **owned** skin's whole card is one button
 * that applies it immediately — this screen re-themes itself live (it reads
 * the real active skin's colours, not a fixed default), so the change is
 * visible right here without a separate window. A **locked** skin's whole
 * card instead opens the full-size preview, since there's nothing to apply
 * yet — you're deciding whether to buy it, not switching to it.
 */
export function SkinsScreen({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { skins, activeSkin, isOwned, setActiveSkin, unlockSkin } = useSkin();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const productIds = useMemo(() => skins.map((s) => s.productId).filter((id): id is string => !!id), [skins]);
  // useSkinPurchases only knows Play Billing product ids, not skin ids — the
  // two are deliberately different strings (see Skin.productId), so unlocking
  // has to translate one into the other before it reaches unlockSkin.
  const unlockByProductId = useCallback(
    (productId: string) => {
      const skin = skins.find((s) => s.productId === productId);
      if (skin) unlockSkin(skin.id);
    },
    [skins, unlockSkin],
  );
  const iap = useSkinPurchases(productIds, unlockByProductId);

  const previewSkin = previewId ? skins.find((s) => s.id === previewId) : undefined;
  if (previewSkin) {
    const owned = isOwned(previewSkin.id);
    const active = previewSkin.id === activeSkin.id;
    return (
      <SkinPreviewScreen
        skin={previewSkin}
        owned={owned}
        active={active}
        badge={badgeFor(previewSkin, active, owned, iap.pricesByProductId, t)}
        iap={iap}
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
          livePrices={iap.pricesByProductId}
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
  livePrices,
  onSelect,
  onPreview,
}: {
  skin: Skin;
  active: boolean;
  owned: boolean;
  livePrices: Record<string, string>;
  onSelect: () => void;
  /** Only ever called for a locked skin — an owned one applies on tap instead. */
  onPreview: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const fg = active ? colors.onInk : colors.onSurface;
  const badge = badgeFor(skin, active, owned, livePrices, t);

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
        <PixelArt rows={PIXEL_LOCK} size={18} color={colors.onSurface} />
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{t(skin.nameKey)}</Text>
          <Text style={styles.cardTagline} numberOfLines={2}>
            {t(skin.taglineKey)}
          </Text>
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
        <SkinPreview skin={skin} />
        <Text style={[styles.cardGlyph, { color: fg }]}>{active ? '▸' : ' '}</Text>
        <View style={styles.cardText}>
          <Text style={[styles.cardName, { color: fg }]}>{t(skin.nameKey)}</Text>
          <Text style={[styles.cardTagline, { color: fg }]} numberOfLines={2}>
            {t(skin.taglineKey)}
          </Text>
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
    <View style={[thumbStyles.preview, { backgroundColor: skin.shell.bezel }]}>
      <View style={[thumbStyles.previewScreen, { backgroundColor: skin.lcd.lightest }]}>
        <View style={[thumbStyles.previewInk, { backgroundColor: skin.lcd.darkest }]} />
      </View>
      <View style={[thumbStyles.previewButton, { backgroundColor: skin.shell.button, borderColor: skin.shell.buttonDeep }]} />
    </View>
  );
}

/** Layout only — no colour is ever fixed here, so unlike `createStyles` this
 *  needs no active-skin awareness and can stay a plain module-level sheet. */
const thumbStyles = StyleSheet.create({
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
});

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
              // Both branches read against a dark-ish fill once pressed
              // (`print` for ghost, `buttonDeep` for filled) — onPrint is
              // the colour tuned for that, same as Button.tsx.
              {
                color: ghost
                  ? pressed
                    ? skin.shell.onPrint
                    : skin.shell.print
                  : pressed
                    ? skin.shell.onPrint
                    : skin.shell.onButton,
              },
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

/** The locked-preview's primary action: buy the skin through Play Billing,
 *  or say plainly why that's not possible right now (still connecting, or —
 *  on web, where there's no store at all — permanently). */
function BuySkinButton({ skin, badge, iap }: { skin: Skin; badge: string; iap: SkinPurchases }) {
  const { t } = useI18n();
  const productId = skin.productId;
  const busy = !!productId && iap.purchasingId === productId;

  if (!productId || !iap.ready) {
    return <PreviewActionButton testID="skin-preview-buy" label={t('skins.purchaseUnavailable')} skin={skin} disabled onPress={() => {}} />;
  }

  return (
    <PreviewActionButton
      testID="skin-preview-buy"
      label={busy ? t('skins.purchasing') : t('skins.buy', { price: badge })}
      skin={skin}
      disabled={busy}
      onPress={() => iap.purchase(productId)}
    />
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
  iap,
  onBack,
  onSelect,
}: {
  skin: Skin;
  owned: boolean;
  active: boolean;
  badge: string;
  iap: SkinPurchases;
  onBack: () => void;
  onSelect: () => void;
}) {
  const { t, locale } = useI18n();
  const { state } = useGame();
  const insets = useSafeAreaInsets();
  const c = deriveColors(skin);

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
        <Text style={[previewStyles.headerName, { color: skin.shell.onShell }]}>{t(skin.nameKey)}</Text>
        <Text style={[previewStyles.headerTagline, { color: skin.shell.onShell }]} numberOfLines={2}>
          {t(skin.taglineKey)}
        </Text>
        <Text style={[previewStyles.headerBadge, { color: skin.shell.onShell }]}>{badge}</Text>
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
          {/* The real texture, not a flat guess — this is what a shopper is
              actually paying for, so it has to be the genuine article: the
              same DotMatrix pixel grid or animated BeachScene the live
              Screen.tsx renders, in the previewed skin's own colours rather
              than whichever skin is currently active in the app. */}
          {skin.sceneId === 'shoreline' ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <SandFill />
              <BeachScene />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: 0.55 }]} />
            </View>
          ) : (
            <DotMatrix lcd={skin.lcd} />
          )}
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
                      { borderColor: localeActive ? c.ink : c.onSurface, backgroundColor: localeActive ? c.ink : c.surface },
                    ]}
                  >
                    <Text style={[previewStyles.langCode, { color: localeActive ? c.onInk : c.onSurface }]}>{code}</Text>
                  </View>
                );
              })}
            </View>

            <MiniSectionLabel label={`${t('setup.players')}  (${state.players.length})`} color={c.ink} />
            {state.players.map((p, i) => (
              <View key={p.id} style={previewStyles.playerRow}>
                <View style={[previewStyles.playerIndex, { borderColor: c.onSurface }]}>
                  <Text style={[previewStyles.playerIndexText, { color: c.onSurface }]}>{i + 1}</Text>
                </View>
                <View style={[previewStyles.playerInput, { borderColor: c.onSurface, backgroundColor: c.surface }]}>
                  <Text style={[previewStyles.playerName, { color: c.onSurface }]} numberOfLines={1}>
                    {p.name || t('setup.playerPlaceholder', { n: i + 1 })}
                  </Text>
                </View>
              </View>
            ))}

            <MiniSectionLabel label={t('setup.chooseMode')} color={c.ink} />
            {GAME_MODES.map((m) => {
              const selected = m === state.mode;
              const fg = selected ? c.onInk : c.onSurface;
              return (
                <View
                  key={m}
                  style={[previewStyles.modeCard, { borderColor: selected ? c.ink : c.onSurface, backgroundColor: selected ? c.ink : c.surface }]}
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
        <Text style={[previewStyles.wmSmall, { color: skin.shell.onShell }]}>Impostor</Text>
        <Text style={[previewStyles.wmLarge, { color: skin.shell.onShell }]}>PARTY</Text>
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
          <BuySkinButton skin={skin} badge={badge} iap={iap} />
        )}
        <PreviewActionButton testID="skin-preview-back" label={t('skins.back')} skin={skin} ghost onPress={onBack} />
      </View>
    </View>
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.onSurface,
      marginBottom: spacing.sm,
    },
    cardActive: { backgroundColor: colors.ink, borderWidth: stroke.thin },
    cardLocked: { opacity: 0.55 },
    cardGlyph: { ...type.heading, width: 16 },
    cardText: { flex: 1 },
    cardName: { ...type.label, textTransform: 'uppercase' },
    cardTagline: { ...type.caption, marginTop: 2, letterSpacing: 0 },
    cardBadge: { ...type.caption, letterSpacing: 0 },
    doneButton: { marginTop: spacing.lg },
  });
}

const previewStyles = StyleSheet.create({
  page: { flex: 1 },
  header: { marginBottom: spacing.sm },
  headerName: { ...type.heading, textAlign: 'center', textTransform: 'uppercase' },
  headerTagline: { ...type.caption, textAlign: 'center', marginTop: 2, letterSpacing: 0 },
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
  // No fontStyle: 'italic' — same fix as Screen.tsx's wordmarkLarge, see
  // there for why: Android fakes italic on this font by shearing glyphs but
  // still clips paint to the upright measured width, cutting the last
  // letter's slanted overhang clean off. A skew transform avoids that.
  wmLarge: { ...type.caption, fontSize: 15, lineHeight: 20, letterSpacing: 1, transform: [{ skewX: '-12deg' }], paddingRight: 4 },
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
