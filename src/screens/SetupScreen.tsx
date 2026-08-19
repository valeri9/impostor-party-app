import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Stepper, ToggleRow } from '../components/Stepper';
import { civiliansFor, clampMafiaConfig, maxMafiaFor } from '../game/assign';
import { useGame } from '../game/GameContext';
import { GAME_MODES, GameMode, MAX_PLAYERS, MIN_PLAYERS } from '../game/types';
import { LANGUAGE_FLAGS, LANGUAGE_NAMES, LOCALES, useI18n } from '../i18n';
import { haptics } from '../native/haptics';
import { colors, MODE_ACCENT, radii, spacing, type } from '../theme/tokens';

export function SetupScreen() {
  const { t, locale, setLocale } = useI18n();
  const { state, dispatch, startGame } = useGame();
  const { players, mode, mafiaConfig } = state;

  const allNamed = players.every((p) => p.name.trim().length > 0);
  const canStart = allNamed && players.length >= MIN_PLAYERS;

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
      <Text style={styles.title}>{t('app.title')}</Text>
      <Text style={styles.tagline}>{t('app.tagline')}</Text>

      <Section label={t('setup.language')} />
      <View style={styles.langRow}>
        {LOCALES.map((code) => {
          const active = code === locale;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                haptics.selection();
                setLocale(code);
              }}
              style={[styles.langPill, active && styles.langPillActive]}
            >
              <Text style={styles.langFlag}>{LANGUAGE_FLAGS[code]}</Text>
              <Text style={[styles.langName, active && styles.langNameActive]}>{LANGUAGE_NAMES[code]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Section label={`${t('setup.players')}  (${players.length})`} />
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
            placeholderTextColor={colors.textFaint}
            maxLength={16}
            autoCorrect={false}
            returnKeyType="done"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.light();
              dispatch({ type: 'REMOVE_PLAYER', id: player.id });
            }}
            disabled={players.length <= MIN_PLAYERS}
            style={[styles.removeButton, players.length <= MIN_PLAYERS && styles.removeDisabled]}
          >
            <Text style={styles.removeGlyph}>×</Text>
          </Pressable>
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

      <Section label={t('setup.chooseMode')} />
      {GAME_MODES.map((m) => (
        <ModeCard key={m} mode={m} selected={m === mode} onSelect={() => dispatch({ type: 'SET_MODE', mode: m })} />
      ))}

      {mode === 'mafia' ? (
        <View style={styles.mafiaPanel}>
          <Section label={t('mafia.setup.title')} />
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
    </Screen>
  );
}

function Section({ label }: { label: string }) {
  return <Text style={styles.section}>{label}</Text>;
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
  const accent = MODE_ACCENT[mode];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onSelect();
      }}
      style={[styles.modeCard, selected && { borderColor: accent, backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.modeDot, { backgroundColor: selected ? accent : colors.border }]} />
      <View style={styles.modeText}>
        <Text style={[styles.modeName, selected && { color: colors.text }]}>{t(`mode.${mode}.name`)}</Text>
        <Text style={styles.modeDesc}>{t(`mode.${mode}.desc`)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...type.hero, color: colors.text, textAlign: 'center' },
  tagline: { ...type.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  section: {
    ...type.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langPillActive: { borderColor: colors.indigo, backgroundColor: colors.surfaceAlt },
  langFlag: { fontSize: 18 },
  langName: { ...type.caption, color: colors.textMuted },
  langNameActive: { color: colors.text },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  playerIndex: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerIndexText: { ...type.caption, color: colors.textMuted },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    ...type.body,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  removeDisabled: { opacity: 0.3 },
  removeGlyph: { fontSize: 24, color: colors.rose, lineHeight: 26 },
  addButton: { marginTop: spacing.xs },
  hint: { ...type.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.sm },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  modeDot: { width: 14, height: 14, borderRadius: radii.pill },
  modeText: { flex: 1 },
  modeName: { ...type.label, color: colors.textMuted },
  modeDesc: { ...type.caption, color: colors.textFaint, marginTop: 2 },
  mafiaPanel: { marginTop: spacing.xs },
  civilianRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  civilianLabel: { ...type.label, color: colors.textMuted },
  civilianValue: { ...type.heading, color: colors.emerald },
  startButton: { marginTop: spacing.lg },
  warning: { ...type.caption, color: colors.rose, textAlign: 'center', marginTop: spacing.sm },
});
