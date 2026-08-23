import React, { useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccusationCountdown } from '../../components/AccusationCountdown';
import { Button } from '../../components/Button';
import { DrawCanvas } from '../../components/DrawCanvas';
import { usePressScale } from '../../components/pressAnim';
import { Screen } from '../../components/Screen';
import { useGame } from '../../game/GameContext';
import { roundProgress } from '../../game/rounds';
import type { CanvasRound } from '../../game/types';
import { useI18n } from '../../i18n';
import { haptics } from '../../native/haptics';
import { playSound } from '../../native/sound';
import { useSkinTokens } from '../../theme/SkinContext';
import { MODE_GLYPH, spacing, stroke, type } from '../../theme/tokens';

export function CanvasPlayScreen({ round }: { round: CanvasRound }) {
  const { t } = useI18n();
  const { dispatch, playerById } = useGame();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = colors.ink;

  // One stroke per player per round, so the stroke count is the turn cursor and
  // the phone goes round the table `round.rounds` times.
  const players = round.order.length;
  const turn = round.strokes.length;
  const { done: finished, currentIndex, currentRound } = roundProgress(turn, players, round.rounds);
  const currentId = finished ? null : round.order[currentIndex];
  const current = currentId ? playerById(currentId) : null;

  // The pencil colour is the player's choice and stays put when the phone is
  // passed — it only changes when someone taps a different swatch.
  const [color, setColor] = useState<string>(colors.swatches[0]);
  // True between a locked stroke and the next player taking the phone.
  const [awaitingPass, setAwaitingPass] = useState(false);

  const next = roundProgress(turn + 1, players, round.rounds);
  const nextName = !finished && !next.done ? playerById(round.order[next.currentIndex]).name : null;

  return (
    <Screen>
      <Text style={styles.title}>
        <Text style={styles.glyph}>{MODE_GLYPH.canvas} </Text>
        {t('canvas.play.title')}
        {!finished ? `  ·  ${t('canvas.play.round', { current: currentRound, total: round.rounds })}` : ''}
      </Text>

      {finished ? (
        <Text style={styles.headline}>{t('canvas.artwork')}</Text>
      ) : awaitingPass ? (
        <Text style={[styles.headline, { color: accent }]} adjustsFontSizeToFit numberOfLines={1}>
          {nextName ? t('canvas.play.passTo', { name: nextName }) : t('canvas.play.locked')}
        </Text>
      ) : (
        <Text style={styles.headline} adjustsFontSizeToFit numberOfLines={1}>
          {t('canvas.play.yourTurn', { name: current?.name ?? '' })}
        </Text>
      )}

      <Text style={styles.instruction}>{t('canvas.play.instruction')}</Text>

      <DrawCanvas
        strokes={round.strokes}
        color={color}
        enabled={!finished && !awaitingPass}
        onMeasure={(width, height) => dispatch({ type: 'SET_CANVAS_SIZE', width, height })}
        onStrokeComplete={(d) => {
          if (!currentId) return;
          dispatch({ type: 'ADD_STROKE', stroke: { playerId: currentId, color, d } });
          setAwaitingPass(true);
        }}
      />

      {!finished && !awaitingPass ? (
        <View style={styles.paletteWrap}>
          <Text style={styles.paletteLabel}>{t('canvas.play.pickColor')}</Text>
          <View style={styles.palette}>
            {colors.swatches.map((swatch) => (
              <Swatch
                key={swatch}
                color={swatch}
                active={swatch === color}
                onSelect={() => setColor(swatch)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {awaitingPass && !finished ? (
        <Button
          label={nextName ? t('canvas.play.passTo', { name: nextName }) : t('canvas.play.finish')}
          testID="canvas-pass"
          variant="primary"
          large
          onPress={() => setAwaitingPass(false)}
          style={styles.action}
        />
      ) : null}

      {finished ? (
        <AccusationCountdown
          revealLabel={t('results.showImpostor')}
          testID="show-results"
          onReveal={() => dispatch({ type: 'SHOW_RESULTS' })}
        />
      ) : null}
    </Screen>
  );
}

function Swatch({ color, active, onSelect }: { color: string; active: boolean; onSelect: () => void }) {
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale(0.82);
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
        style={[styles.swatch, { backgroundColor: color }, active && styles.swatchActive]}
      />
    </Animated.View>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    title: { ...type.caption, color: colors.ink, textAlign: 'center', textTransform: 'uppercase' },
    glyph: { color: colors.inkSoft },
    headline: { ...type.title, color: colors.ink, textAlign: 'center', marginTop: spacing.xs },
    instruction: {
      ...type.caption,
      color: colors.inkSoft,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    paletteWrap: { marginTop: spacing.md },
    paletteLabel: {
      ...type.caption,
      color: colors.inkSoft,
      textAlign: 'center',
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    palette: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
    // Four square chips, one per shade the screen can draw. The selected one is
    // marked by a heavier frame, since there is no highlight colour to give it.
    swatch: { width: 48, height: 48, borderWidth: stroke.hair, borderColor: colors.ink },
    swatchActive: { borderWidth: stroke.thick },
    action: { marginTop: spacing.md },
  });
}
