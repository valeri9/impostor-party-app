import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '../components/Button';
import { DrawingPreview } from '../components/DrawCanvas';
import { PlayingCard } from '../components/PlayingCard';
import { Screen } from '../components/Screen';
import { useGame } from '../game/GameContext';
import type { CanvasRound, MafiaRound, Round, TimerRound, WordRound } from '../game/types';
import { localized, useI18n } from '../i18n';
import { colors, MODE_ACCENT, radii, spacing, type } from '../theme/tokens';

export function ResultsScreen() {
  const { t } = useI18n();
  const { state, newGame, dispatch } = useGame();
  const round = state.round;
  if (!round) return null;

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('results.title')}</Text>
      <Body round={round} />
      <Button label={t('results.newGame')} variant="success" large onPress={newGame} style={styles.action} />
      <Button
        label={t('results.backToSetup')}
        variant="ghost"
        onPress={() => dispatch({ type: 'BACK_TO_SETUP' })}
        style={styles.action}
      />
    </Screen>
  );
}

function Body({ round }: { round: Round }) {
  switch (round.mode) {
    case 'word':
      return <WordResults round={round} />;
    case 'canvas':
      return <CanvasResults round={round} />;
    case 'timer':
      return <TimerResults round={round} />;
    case 'mafia':
      return <MafiaResults round={round} />;
  }
}

/** Shared headline naming the impostor. */
function ImpostorBanner({ name, accent }: { name: string; accent: string }) {
  const { t } = useI18n();
  return (
    <View style={[styles.banner, { borderColor: accent }]}>
      <Text style={styles.bannerLabel}>{t('results.theImpostor')}</Text>
      <Text style={styles.bannerName} adjustsFontSizeToFit numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function Fact({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, accent ? { color: accent } : null]} adjustsFontSizeToFit numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function WordResults({ round }: { round: WordRound }) {
  const { t, locale } = useI18n();
  const { playerById } = useGame();
  return (
    <View>
      <ImpostorBanner name={playerById(round.impostorId).name} accent={MODE_ACCENT.word} />
      <Fact label={t('results.secretWord')} value={localized(round.prompt.exact, locale)} accent={colors.emerald} />
      <Fact label={t('secret.hint')} value={localized(round.prompt.hint, locale)} accent={colors.amber} />
    </View>
  );
}

function CanvasResults({ round }: { round: CanvasRound }) {
  const { t, locale } = useI18n();
  const { playerById } = useGame();
  const { width } = useWindowDimensions();

  return (
    <View>
      <Text style={styles.section}>{t('canvas.artwork')}</Text>
      <DrawingPreview strokes={round.strokes} canvas={round.canvas} width={width - spacing.lg * 2} />
      {/* Strokes share whatever colour was chosen, so list the draw order
          instead of a colour key. The same order repeats each round. */}
      <Text style={styles.section}>
        {t('word.play.turnOrder')} · {t('canvas.play.round', { current: round.rounds, total: round.rounds })}
      </Text>
      <View style={styles.legend}>
        {round.order.map((id, i) => (
          <View key={id} style={styles.legendItem}>
            <Text style={styles.legendIndex}>{i + 1}</Text>
            <Text style={styles.legendName}>{playerById(id).name}</Text>
          </View>
        ))}
      </View>
      <ImpostorBanner name={playerById(round.impostorId).name} accent={MODE_ACCENT.canvas} />
      <Fact label={t('results.secretObject')} value={localized(round.prompt.exact, locale)} accent={colors.emerald} />
      <Fact label={t('secret.hint')} value={localized(round.prompt.hint, locale)} accent={colors.amber} />
    </View>
  );
}

function TimerResults({ round }: { round: TimerRound }) {
  const { t } = useI18n();
  const { playerById } = useGame();

  const rows = round.order
    .map((id) => {
      const ms = round.times[id] ?? 0;
      return { id, ms, delta: Math.abs(ms - round.targetMs) };
    })
    .sort((a, b) => a.delta - b.delta);

  return (
    <View>
      <ImpostorBanner name={playerById(round.impostorId).name} accent={MODE_ACCENT.timer} />
      <Fact
        label={t('results.target')}
        value={`${(round.targetMs / 1000).toFixed(1)}${t('common.seconds')}`}
        accent={colors.emerald}
      />

      <Text style={styles.section}>{t('results.yourTimes')}</Text>
      {rows.map((row, i) => {
        const isImpostor = row.id === round.impostorId;
        const late = row.ms > round.targetMs;
        return (
          <View
            key={row.id}
            style={[styles.timeRow, isImpostor && { borderColor: colors.rose, backgroundColor: colors.surfaceAlt }]}
          >
            <Text style={styles.timeRank}>{i === 0 ? '🏆' : `${i + 1}`}</Text>
            <View style={styles.timeName}>
              <Text style={styles.timeNameText} numberOfLines={1}>
                {playerById(row.id).name}
              </Text>
              {isImpostor ? <Text style={styles.timeTag}>{t('role.impostor')}</Text> : null}
            </View>
            <View style={styles.timeValues}>
              <Text style={styles.timeMain}>
                {(row.ms / 1000).toFixed(1)}
                {t('common.seconds')}
              </Text>
              <Text style={[styles.timeDelta, { color: i === 0 ? colors.emerald : colors.textFaint }]}>
                {late ? '+' : '−'}
                {(row.delta / 1000).toFixed(1)} {t('results.off')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MafiaResults({ round }: { round: MafiaRound }) {
  const { t } = useI18n();
  const { playerById } = useGame();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min((width - spacing.lg * 2 - spacing.md * 2) / 3, 110);

  return (
    <View>
      <Text style={styles.section}>{t('results.allRoles')}</Text>
      <View style={styles.cardGrid}>
        {round.order.map((id) => {
          const assignment = round.deal[id];
          return (
            <View key={id} style={styles.cardCell}>
              <PlayingCard
                rank={assignment.card.rank}
                suit={assignment.card.suit}
                width={cardWidth}
                faceUp
                roleLabel={t(`role.${assignment.role}`)}
              />
              <Text style={styles.cardName} numberOfLines={1}>
                {playerById(id).name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  section: {
    ...type.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  banner: {
    borderWidth: 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  bannerLabel: {
    ...type.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bannerName: { ...type.hero, color: colors.rose, marginTop: spacing.xs },
  fact: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  factLabel: {
    ...type.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  factValue: { ...type.heading, color: colors.text, marginTop: spacing.xs, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendIndex: {
    ...type.caption,
    color: colors.textFaint,
    minWidth: 18,
    textAlign: 'right',
  },
  legendName: { ...type.caption, color: colors.textMuted },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  timeRank: { ...type.label, color: colors.textFaint, width: 28, textAlign: 'center' },
  timeName: { flex: 1 },
  timeNameText: { ...type.body, color: colors.text },
  timeTag: { ...type.caption, color: colors.rose, marginTop: 2 },
  timeValues: { alignItems: 'flex-end' },
  timeMain: { ...type.heading, color: colors.text, fontVariant: ['tabular-nums'] },
  timeDelta: { ...type.caption },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  cardCell: { alignItems: 'center', gap: spacing.xs },
  cardName: { ...type.caption, color: colors.text, maxWidth: 110, textAlign: 'center' },
  action: { marginTop: spacing.md },
});
