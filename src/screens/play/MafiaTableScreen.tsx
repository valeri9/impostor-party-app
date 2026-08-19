import React, { useEffect, useRef, useState } from 'react';
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
import { colors, MODE_ACCENT, radii, spacing, type } from '../../theme/tokens';

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
  const accent = MODE_ACCENT.mafia;
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
      <Text style={styles.title}>{t('mafia.table.title')}</Text>
      <Text style={styles.instruction}>{t('mafia.table.instruction')}</Text>

      <View style={styles.clockWrap}>
        <View style={[styles.clock, { borderColor: expired ? colors.rose : accent }]}>
          <Text testID="mafia-clock" style={[styles.clockText, expired && { color: colors.rose }]}>
            {formatClock(remainingMs)}
          </Text>
          <Text style={styles.playerCount}>
            {round.order.length} {t('setup.players').toLowerCase()}
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

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  instruction: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  clockWrap: { alignItems: 'center', marginBottom: spacing.lg },
  clock: {
    width: 260,
    height: 180,
    borderRadius: radii.lg,
    borderWidth: 3,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockText: { fontSize: 68, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  playerCount: { ...type.caption, color: colors.textFaint, marginTop: spacing.xs },
  controls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  control: { flex: 1 },
  spacer: { flex: 1 },
});
