import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { DrawCanvas } from '../../components/DrawCanvas';
import { Screen } from '../../components/Screen';
import { useGame } from '../../game/GameContext';
import type { CanvasRound } from '../../game/types';
import { useI18n } from '../../i18n';
import { colors, MODE_ACCENT, radii, spacing, type } from '../../theme/tokens';

export function CanvasPlayScreen({ round }: { round: CanvasRound }) {
  const { t } = useI18n();
  const { dispatch, playerById } = useGame();
  const accent = MODE_ACCENT.canvas;

  // One stroke per player per round, so the stroke count is the turn cursor and
  // the phone goes round the table `round.rounds` times.
  const players = round.order.length;
  const totalTurns = players * round.rounds;
  const turn = round.strokes.length;
  const finished = turn >= totalTurns;
  const currentId = finished ? null : round.order[turn % players];
  const current = currentId ? playerById(currentId) : null;
  const currentRound = Math.min(Math.floor(turn / players) + 1, round.rounds);

  // The pencil colour is the player's choice and stays put when the phone is
  // passed — it only changes when someone taps a different swatch.
  const [color, setColor] = useState<string>(colors.swatches[0]);
  // True between a locked stroke and the next player taking the phone.
  const [awaitingPass, setAwaitingPass] = useState(false);

  const nextName =
    !finished && turn + 1 < totalTurns ? playerById(round.order[(turn + 1) % players]).name : null;

  return (
    <Screen>
      <Text style={styles.title}>
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
              <Pressable
                key={swatch}
                accessibilityRole="button"
                accessibilityState={{ selected: swatch === color }}
                onPress={() => setColor(swatch)}
                style={[
                  styles.swatch,
                  { backgroundColor: swatch },
                  swatch === color && styles.swatchActive,
                ]}
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
        <Button
          label={t('results.showImpostor')}
          testID="show-results"
          variant="danger"
          large
          onPress={() => dispatch({ type: 'SHOW_RESULTS' })}
          style={styles.action}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.caption,
    color: colors.textFaint,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headline: { ...type.title, color: colors.text, textAlign: 'center', marginTop: spacing.xs },
  instruction: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  paletteWrap: { marginTop: spacing.md },
  paletteLabel: {
    ...type.caption,
    color: colors.textFaint,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  palette: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: colors.text, transform: [{ scale: 1.12 }] },
  action: { marginTop: spacing.md },
});
