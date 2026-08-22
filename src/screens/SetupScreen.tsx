import React, { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { usePressScale } from '../components/pressAnim';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { Stepper, ToggleRow } from '../components/Stepper';
import { civiliansFor, clampMafiaConfig, maxMafiaFor } from '../game/assign';
import { useGame } from '../game/GameContext';
import { GAME_MODES, GameMode, MAX_PLAYERS, MAX_ROUNDS, MIN_PLAYERS, MIN_ROUNDS } from '../game/types';
import { LANGUAGE_NAMES, LOCALES, useI18n } from '../i18n';
import { openDonateLink } from '../native/donate';
import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { useSkinTokens } from '../theme/SkinContext';
import { MODE_GLYPH, spacing, stroke, type } from '../theme/tokens';

export function SetupScreen({
  onHowToPlay,
  onSkins,
}: {
  onHowToPlay: () => void;
  onSkins: () => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const { state, dispatch, startGame } = useGame();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { players, mode, mafiaConfig, roundsConfig } = state;

  const allNamed = players.every((p) => p.name.trim().length > 0);
  const canStart = allNamed && players.length >= MIN_PLAYERS && mode !== null;

  const clampedMafia = useMemo(
    () => clampMafiaConfig(mafiaConfig, players.length),
    [mafiaConfig, players.length],
  );
  const civilians = civiliansFor(clampedMafia, players.length);

  const updateMafia = (patch: Partial<typeof mafiaConfig>) =>
    dispatch({
      type: 'SET_MAFIA_CONFIG',
      config: clampMafiaConfig({ ...clampedMafia, ...patch }, players.length),
    });

  return (
    <Screen scroll>
      {/* A cartridge boot screen: the title framed, the tagline underneath. */}
      <View style={styles.titlePlate}>
        <Text style={styles.title} adjustsFontSizeToFit numberOfLines={1}>
          {t('app.title')}
        </Text>
      </View>
      <View style={styles.titleButtonRow}>
        <SkinsButton onPress={onSkins} />
        <Text style={styles.tagline}>{t('app.tagline')}</Text>
        <HowToPlayButton onPress={onHowToPlay} />
      </View>

      <SectionLabel label={t('setup.language')} />
      <View style={styles.langRow}>
        {LOCALES.map((code) => (
          <LangPill key={code} code={code} active={code === locale} onSelect={() => setLocale(code)} />
        ))}
      </View>

      <SectionLabel label={`${t('setup.players')}  (${players.length})`} />
      {players.map((player, i) => (
        <View key={player.id} style={styles.playerRow}>
          <View style={styles.playerIndex}>
            <Text style={styles.playerIndexText}>{i + 1}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={player.name}
            onChangeText={(name) => dispatch({ type: 'SET_PLAYER_NAME', id: player.id, name })}
            placeholder={t('setup.playerPlaceholder', { n: i + 1 })}
            placeholderTextColor={colors.inkSoft}
            maxLength={16}
            autoCorrect={false}
            returnKeyType="done"
          />
          <RemoveButton
            onPress={() => dispatch({ type: 'REMOVE_PLAYER', id: player.id })}
            disabled={players.length <= MIN_PLAYERS}
          />
        </View>
      ))}

      <Button
        label={t('setup.addPlayer')}
        variant="ghost"
        onPress={() => dispatch({ type: 'ADD_PLAYER' })}
        disabled={players.length >= MAX_PLAYERS}
        style={styles.addButton}
      />
      <Text style={styles.hint}>
        {players.length >= MAX_PLAYERS ? t('setup.maxPlayers') : t('setup.minPlayers')}
      </Text>

      <SectionLabel label={t('setup.chooseMode')} />
      {GAME_MODES.map((m) => (
        <ModeCard key={m} mode={m} selected={m === mode} onSelect={() => dispatch({ type: 'SET_MODE', mode: m })} />
      ))}

      {mode === 'mafia' ? (
        <View style={styles.mafiaPanel}>
          <SectionLabel label={t('mafia.setup.title')} />
          <Stepper
            label={t('mafia.mafiaCount')}
            value={clampedMafia.mafiaCount}
            min={1}
            max={maxMafiaFor(players.length)}
            onChange={(mafiaCount) => updateMafia({ mafiaCount })}
          />
          <ToggleRow
            label={t('mafia.detective')}
            value={clampedMafia.detective}
            onChange={(detective) => updateMafia({ detective })}
          />
          <ToggleRow
            label={t('mafia.doctor')}
            value={clampedMafia.doctor}
            onChange={(doctor) => updateMafia({ doctor })}
          />
          <View style={styles.civilianRow}>
            <Text style={styles.civilianLabel}>{t('mafia.civilians')}</Text>
            <Text style={styles.civilianValue}>{civilians}</Text>
          </View>
        </View>
      ) : mode ? (
        <View style={styles.mafiaPanel}>
          <Stepper
            label={t('setup.rounds')}
            value={roundsConfig[mode]}
            min={MIN_ROUNDS}
            max={MAX_ROUNDS}
            onChange={(rounds) => dispatch({ type: 'SET_ROUNDS', mode, rounds })}
          />
        </View>
      ) : null}

      <Button
        label={t('setup.start')}
        testID="start-game"
        variant="success"
        large
        disabled={!canStart}
        onPress={startGame}
        style={styles.startButton}
      />
      {!allNamed ? <Text style={styles.warning}>{t('setup.nameRequired')}</Text> : null}

      <DonateLink />
    </Screen>
  );
}

/** A quiet, easy-to-ignore link — never a prompt, never in the way of starting a game. */
function DonateLink() {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      testID="donate-link"
      accessibilityRole="button"
      onPress={() => {
        haptics.selection();
        openDonateLink();
      }}
      style={({ pressed }) => [styles.donateLink, pressed && styles.donateLinkPressed]}
    >
      <Text style={styles.donateLinkText}>☕ {t('setup.donate')}</Text>
    </Pressable>
  );
}

/** The corner badge on the boot screen — reopens onboarding any time. */
function HowToPlayButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  const { colors, SHELL } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale(0.85);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID="how-to-play"
        accessibilityRole="button"
        accessibilityLabel={t('howto.open')}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.selection();
          playSound('tick');
          onPress();
        }}
        style={({ pressed }) => [
          styles.howToPlayButton,
          { borderColor: SHELL.buttonDeep, backgroundColor: pressed ? SHELL.buttonDeep : SHELL.button },
        ]}
      >
        <Text style={[styles.howToPlayGlyph, { color: SHELL.onButton }]}>?</Text>
      </Pressable>
    </Animated.View>
  );
}

/** The corner badge on the boot screen — opens the skin catalogue. */
function SkinsButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  const { colors, SHELL } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale(0.85);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID="open-skins"
        accessibilityRole="button"
        accessibilityLabel={t('skins.open')}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.selection();
          playSound('tick');
          onPress();
        }}
        style={({ pressed }) => [
          styles.skinsButton,
          { borderColor: SHELL.buttonDeep, backgroundColor: pressed ? SHELL.buttonDeep : SHELL.button },
        ]}
      >
        <Text style={[styles.skinsGlyph, { color: SHELL.onButton }]}>◨</Text>
      </Pressable>
    </Animated.View>
  );
}

function LangPill({ code, active, onSelect }: { code: (typeof LOCALES)[number]; active: boolean; onSelect: () => void }) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale(0.9);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.selection();
          playSound('tick');
          onSelect();
        }}
        style={[styles.langPill, active && styles.langPillActive]}
      >
        <Text style={[styles.langCode, active && styles.langTextActive]}>{code}</Text>
        <Text style={[styles.langName, active && styles.langTextActive]}>{LANGUAGE_NAMES[code]}</Text>
      </Pressable>
    </Animated.View>
  );
}

function RemoveButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale(0.85);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.light();
          playSound('tick');
          onPress();
        }}
        disabled={disabled}
        style={[styles.removeButton, disabled && styles.removeDisabled]}
      >
        <Text style={styles.removeGlyph}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: GameMode;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fg = selected ? colors.onInk : colors.ink;
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.selection();
          playSound('tick');
          onSelect();
        }}
        style={[styles.modeCard, selected && styles.modeCardSelected]}
      >
        <Text style={[styles.modeGlyph, { color: fg }]}>{selected ? '▸' : ' '}</Text>
        <Text style={[styles.modeGlyph, { color: fg }]}>{MODE_GLYPH[mode]}</Text>
        <View style={styles.modeText}>
          <Text style={[styles.modeName, { color: fg }]}>{t(`mode.${mode}.name`)}</Text>
          <Text style={[styles.modeDesc, { color: fg }]}>{t(`mode.${mode}.desc`)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    titlePlate: {
      borderWidth: stroke.thick,
      borderColor: colors.ink,
      backgroundColor: colors.ink,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    titleButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    howToPlayButton: {
      width: 38,
      height: 38,
      borderWidth: stroke.thin,
      alignItems: 'center',
      justifyContent: 'center',
    },
    howToPlayGlyph: { ...type.title, lineHeight: 26 },
    skinsButton: {
      width: 38,
      height: 38,
      borderWidth: stroke.thin,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skinsGlyph: { ...type.title, lineHeight: 26 },
    title: { ...type.hero, color: colors.onInk, textAlign: 'center', textTransform: 'uppercase' },
    tagline: {
      ...type.caption,
      flex: 1,
      color: colors.inkSoft,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    langPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      minHeight: 44,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
    },
    langPillActive: { backgroundColor: colors.ink },
    langCode: { ...type.caption, color: colors.ink, textTransform: 'uppercase' },
    langName: { ...type.caption, color: colors.inkSoft },
    langTextActive: { color: colors.onInk },
    playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    playerIndex: {
      width: 32,
      height: 32,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerIndexText: { ...type.caption, color: colors.ink },
    input: {
      flex: 1,
      minHeight: 52,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
      paddingHorizontal: spacing.md,
      color: colors.ink,
      ...type.body,
    },
    removeButton: {
      width: 44,
      height: 44,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    removeDisabled: { opacity: 0.3 },
    removeGlyph: { ...type.heading, color: colors.ink, lineHeight: 22 },
    addButton: { marginTop: spacing.xs },
    hint: { ...type.caption, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.sm },
    modeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
      marginBottom: spacing.sm,
    },
    modeCardSelected: { backgroundColor: colors.ink, borderWidth: stroke.thin },
    modeGlyph: { ...type.heading },
    modeText: { flex: 1 },
    modeName: { ...type.label, textTransform: 'uppercase' },
    modeDesc: { ...type.caption, marginTop: 3, letterSpacing: 0 },
    mafiaPanel: { marginTop: spacing.xs },
    civilianRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.md,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
    },
    civilianLabel: { ...type.label, color: colors.ink, textTransform: 'uppercase' },
    civilianValue: { ...type.heading, color: colors.ink },
    startButton: { marginTop: spacing.lg },
    warning: { ...type.caption, color: colors.ink, textAlign: 'center', marginTop: spacing.sm },
    donateLink: {
      alignSelf: 'center',
      marginTop: spacing.lg,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderWidth: stroke.hair,
      borderColor: colors.ink,
    },
    donateLinkPressed: { opacity: 0.5 },
    donateLinkText: { ...type.label, color: colors.ink, letterSpacing: 0 },
  });
}
