import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Stepper } from '../../components/Stepper';
import { useGame } from '../../game/GameContext';
import type { MafiaRound } from '../../game/types';
import { useI18n } from '../../i18n';
import { haptics } from '../../native/haptics';
import { playSound } from '../../native/sound';
import { useSkinTokens } from '../../theme/SkinContext';
import { MODE_GLYPH, spacing, stroke, type } from '../../theme/tokens';

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Round timer for the real-life Mafia game happening around the table. */
export function MafiaTableScreen({ round }: { round: MafiaRound }) {
  const { t } = useI18n();
  const { dispatch } = useGame();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = colors.ink;
  useKeepAwake();

  const [minutes, setMinutes] = useState(3);
  const [remainingMs, setRemainingMs] = useState(3 * 60_000);
  const [running, setRunning] = useState(false);
  const deadlineRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    deadlineRef.current = Date.now() + remainingMs;
    const id = setInterval(() => {
      const left = deadlineRef.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        setRunning(false);
        haptics.warning();
        playSound('buzzer');
      } else {
        setRemainingMs(left);
      }
    }, 200);
    return () => clearInterval(id);
    // remainingMs is intentionally excluded: it is the interval's own output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const expired = remainingMs <= 0;

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text style={styles.glyph}>{MODE_GLYPH.mafia}</Text>
        <Text style={styles.title}>{t('mafia.table.title')}</Text>
      </View>
      <Text style={styles.instruction}>{t('mafia.table.instruction')}</Text>

      <View style={styles.clockWrap}>
        {/* Time up inverts the whole panel — the 1-bit way of flashing red. */}
        <View style={[styles.clock, { borderColor: accent }, expired && styles.clockExpired]}>
          <Text testID="mafia-clock" style={[styles.clockText, expired && styles.clockTextExpired]}>
            {formatClock(remainingMs)}
          </Text>
          <Text style={[styles.playerCount, expired && styles.clockTextExpired]}>
            {round.order.length} {t('setup.players')}
          </Text>
        </View>
      </View>

      <Stepper
        label={t('mafia.table.setTime')}
        value={minutes}
        min={1}
        max={15}
        onChange={(next) => {
          // Changing the round length stops and re-arms the clock.
          setRunning(false);
          setMinutes(next);
          setRemainingMs(next * 60_000);
        }}
      />

      <View style={styles.controls}>
        <Button
          testID="mafia-toggle"
          label={running ? t('mafia.table.pause') : t('mafia.table.start')}
          variant={running ? 'primary' : 'success'}
          disabled={expired && !running}
          onPress={() => setRunning((was) => !was)}
          style={styles.control}
        />
        <Button
          testID="mafia-reset"
          label={t('mafia.table.reset')}
          variant="ghost"
          onPress={() => {
            setRunning(false);
            setRemainingMs(minutes * 60_000);
          }}
          style={styles.control}
        />
      </View>

      <View style={styles.spacer} />

      <Button
        label={t('results.showRoles')}
        testID="show-results"
        variant="danger"
        large
        onPress={() => dispatch({ type: 'SHOW_RESULTS' })}
      />
    </Screen>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    title: { ...type.title, color: colors.ink, textAlign: 'center', textTransform: 'uppercase' },
    glyph: { ...type.title, color: colors.inkSoft },
    instruction: {
      ...type.caption,
      color: colors.inkSoft,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    clockWrap: { alignItems: 'center', marginBottom: spacing.lg },
    clock: {
      width: 260,
      height: 180,
      borderWidth: stroke.thick,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockExpired: { backgroundColor: colors.ink },
    clockText: {
      fontFamily: type.hero.fontFamily,
      fontSize: 60,
      fontWeight: '700',
      letterSpacing: 2,
      color: colors.ink,
      fontVariant: ['tabular-nums'],
    },
    clockTextExpired: { color: colors.onInk },
    playerCount: {
      ...type.caption,
      color: colors.inkSoft,
      marginTop: spacing.xs,
      textTransform: 'uppercase',
    },
    controls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    control: { flex: 1 },
    spacer: { flex: 1 },
  });
}
