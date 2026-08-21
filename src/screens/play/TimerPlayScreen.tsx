import React, { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

import { Button } from '../../components/Button';
import { PixelArt, PIXEL_CHECK, PIXEL_CLOCK } from '../../components/PixelArt';
import { usePressScale } from '../../components/pressAnim';
import { Screen } from '../../components/Screen';
import { useGame } from '../../game/GameContext';
import type { TimerRound } from '../../game/types';
import { useI18n } from '../../i18n';
import { haptics } from '../../native/haptics';
import { playSound } from '../../native/sound';
import { useSkinTokens } from '../../theme/SkinContext';
import { spacing, stroke, type } from '../../theme/tokens';

type Stage = 'ready' | 'running' | 'recorded';

/**
 * Sequential blind attempts. The elapsed time is never rendered — not while the
 * timer runs, not after it stops. It only surfaces on the results screen.
 */
export function TimerPlayScreen({ round }: { round: TimerRound }) {
  const { t } = useI18n();
  const { dispatch, playerById } = useGame();
  const { colors, SHELL } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors, SHELL), [colors, SHELL]);
  const accent = colors.ink;
  useKeepAwake();

  const [stage, setStage] = useState<Stage>('ready');
  const startedAtRef = useRef(0);
  const startPress = usePressScale(0.92);
  const stopPress = usePressScale(0.92);

  const turn = round.order.filter((id) => id in round.times).length;
  const allDone = turn >= round.order.length;
  const currentId = allDone ? null : round.order[turn];
  const current = currentId ? playerById(currentId) : null;
  const nextName = turn + 1 < round.order.length ? playerById(round.order[turn + 1]).name : null;

  const start = () => {
    haptics.heavy();
    playSound('click');
    startedAtRef.current = Date.now();
    setStage('running');
  };

  const stop = () => {
    if (!currentId) return;
    const ms = Date.now() - startedAtRef.current;
    haptics.success();
    playSound('chime');
    dispatch({ type: 'RECORD_TIME', playerId: currentId, ms });
    setStage('recorded');
  };

  // Checked before `allDone` so the final player still gets their confirmation.
  if (stage === 'recorded') {
    return (
      <Screen center>
        <View style={styles.doneArt}>
          <PixelArt rows={PIXEL_CHECK} size={64} />
        </View>
        <Text style={styles.headline}>{t('timer.play.recorded')}</Text>
        {nextName ? (
          <Text style={styles.passLine} adjustsFontSizeToFit numberOfLines={2}>
            {t('timer.play.passTo', { name: nextName })}
          </Text>
        ) : null}
        <Button
          label={t('timer.play.continue')}
          variant="primary"
          large
          onPress={() => setStage('ready')}
          style={styles.wideAction}
        />
      </Screen>
    );
  }

  if (allDone) {
    return (
      <Screen center>
        <View style={styles.doneArt}>
          <PixelArt rows={PIXEL_CLOCK} size={64} />
        </View>
        <Text style={styles.headline}>{t('timer.play.allDone')}</Text>
        <Button
          label={t('results.showImpostorTime')}
          testID="show-results"
          variant="danger"
          large
          onPress={() => dispatch({ type: 'SHOW_RESULTS' })}
          style={styles.wideAction}
        />
      </Screen>
    );
  }

  if (stage === 'running') {
    // Deliberately featureless: no digits, no progress bar, no animation that
    // could be counted. Only a huge stop target.
    return (
      <Screen center testID="timer-running">
        <Text style={styles.runningHint}>{t('timer.play.running')}</Text>
        <Animated.View style={{ transform: [{ scale: stopPress.scale }] }}>
          <Pressable
            testID="timer-stop"
            accessibilityRole="button"
            accessibilityLabel={t('timer.play.stop')}
            onPressIn={stopPress.onPressIn}
            onPressOut={stopPress.onPressOut}
            onPress={stop}
            style={({ pressed }) => [
              styles.stopButton,
              { backgroundColor: pressed ? SHELL.buttonDeep : SHELL.button },
            ]}
          >
            <Text style={styles.bigLabel}>{t('timer.play.stop')}</Text>
          </Pressable>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen center>
      <Text style={styles.progress}>
        {t('reveal.progress', { current: turn + 1, total: round.order.length })}
      </Text>
      <Text style={[styles.passLine, { color: accent }]} adjustsFontSizeToFit numberOfLines={2}>
        {t('timer.play.passTo', { name: current?.name ?? '' })}
      </Text>
      <Text style={styles.instruction}>{t('timer.play.ready')}</Text>
      <Animated.View style={{ transform: [{ scale: startPress.scale }] }}>
        <Pressable
          testID="timer-start"
          accessibilityRole="button"
          accessibilityLabel={t('timer.play.start')}
          onPressIn={startPress.onPressIn}
          onPressOut={startPress.onPressOut}
          onPress={start}
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: pressed ? SHELL.buttonDeep : SHELL.button },
          ]}
        >
          <Text style={styles.bigLabel}>{t('timer.play.start')}</Text>
        </Pressable>
      </Animated.View>
    </Screen>
  );
}

const CIRCLE = 220;

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors'], SHELL: ReturnType<typeof useSkinTokens>['SHELL']) {
  return StyleSheet.create({
    progress: { ...type.caption, color: colors.inkSoft, textTransform: 'uppercase', marginBottom: spacing.sm },
    headline: { ...type.title, color: colors.ink, textAlign: 'center', textTransform: 'uppercase' },
    passLine: { ...type.heading, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
    instruction: {
      ...type.caption,
      color: colors.inkSoft,
      textAlign: 'center',
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    runningHint: {
      ...type.caption,
      color: colors.inkSoft,
      textAlign: 'center',
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    // The one place a circle belongs, so these are moulded as the A/B buttons.
    startButton: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      borderWidth: stroke.thick,
      borderColor: SHELL.buttonDeep,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopButton: {
      width: CIRCLE + 40,
      height: CIRCLE + 40,
      borderRadius: (CIRCLE + 40) / 2,
      borderWidth: stroke.thick,
      borderColor: SHELL.buttonDeep,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bigLabel: { ...type.hero, color: SHELL.onButton, textTransform: 'uppercase' },
    doneArt: { marginBottom: spacing.md },
    wideAction: { alignSelf: 'stretch', marginTop: spacing.xl },
  });
}
