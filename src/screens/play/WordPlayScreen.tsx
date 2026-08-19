import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { PlayerChip } from '../../components/PlayerChip';
import { Screen } from '../../components/Screen';
import { useGame } from '../../game/GameContext';
import type { WordRound } from '../../game/types';
import { useI18n } from '../../i18n';
import { colors, MODE_ACCENT, radii, spacing, type } from '../../theme/tokens';

export function WordPlayScreen({ round }: { round: WordRound }) {
  const { t } = useI18n();
  const { dispatch, playerById } = useGame();
  const accent = MODE_ACCENT.word;

  const total = round.order.length;
  const done = round.speakerIndex >= total;
  const current = done ? null : playerById(round.order[round.speakerIndex]);

  return (
    <Screen>
      <Text style={styles.title}>{t('word.play.title')}</Text>
      <Text style={styles.instruction}>{t('word.play.instruction')}</Text>

      <View style={[styles.spotlight, { borderColor: accent }]}>
        <Text style={styles.spotlightLabel}>
          {done ? t('word.play.roundDone') : t('word.play.nowSpeaking')}
        </Text>
        <Text style={styles.spotlightName} adjustsFontSizeToFit numberOfLines={1}>
          {done ? '🎉' : current?.name}
        </Text>
      </View>

      <Text style={styles.section}>{t('word.play.turnOrder')}</Text>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {round.order.map((id, i) => (
          <PlayerChip
            key={id}
            index={i + 1}
            name={playerById(id).name}
            accent={accent}
            active={i === round.speakerIndex}
            done={i < round.speakerIndex}
          />
        ))}
      </ScrollView>

      {!done ? (
        <Button
          label={t('word.play.nextSpeaker')}
          variant="primary"
          onPress={() => dispatch({ type: 'NEXT_SPEAKER' })}
          style={styles.action}
        />
      ) : null}

      <Button
        label={t('results.showImpostor')}
        testID="show-results"
        variant="danger"
        large
        onPress={() => dispatch({ type: 'SHOW_RESULTS' })}
        style={styles.action}
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
    marginBottom: spacing.md,
  },
  spotlight: {
    borderWidth: 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  spotlightLabel: {
    ...type.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  spotlightName: { ...type.hero, color: colors.text, marginTop: spacing.xs },
  section: {
    ...type.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  list: { flex: 1 },
  action: { marginTop: spacing.sm },
});
