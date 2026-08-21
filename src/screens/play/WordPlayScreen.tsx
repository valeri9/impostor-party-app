import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { PixelArt, PIXEL_STAR } from '../../components/PixelArt';
import { PlayerChip } from '../../components/PlayerChip';
import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { useGame } from '../../game/GameContext';
import type { WordRound } from '../../game/types';
import { useI18n } from '../../i18n';
import { useSkinTokens } from '../../theme/SkinContext';
import { MODE_GLYPH, spacing, stroke, type } from '../../theme/tokens';

export function WordPlayScreen({ round }: { round: WordRound }) {
  const { t } = useI18n();
  const { dispatch, playerById } = useGame();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = colors.ink;

  const players = round.order.length;
  const total = players * round.rounds;
  const done = round.speakerIndex >= total;
  const current = done ? null : playerById(round.order[round.speakerIndex % players]);
  const currentRound = Math.min(Math.floor(round.speakerIndex / players) + 1, round.rounds);

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text style={styles.glyph}>{MODE_GLYPH.word}</Text>
        <Text style={styles.title}>
          {t('word.play.title')}
          {!done && round.rounds > 1 ? `  ·  ${t('canvas.play.round', { current: currentRound, total: round.rounds })}` : ''}
        </Text>
      </View>
      <Text style={styles.instruction}>{t('word.play.instruction')}</Text>

      <View style={[styles.spotlight, { borderColor: accent }]}>
        <Text style={styles.spotlightLabel}>
          {done ? t('word.play.roundDone') : t('word.play.nowSpeaking')}
        </Text>
        {done ? (
          <View style={styles.spotlightArt}>
            <PixelArt rows={PIXEL_STAR} size={48} color={colors.onInk} />
          </View>
        ) : (
          <Text style={styles.spotlightName} adjustsFontSizeToFit numberOfLines={1}>
            {current?.name}
          </Text>
        )}
      </View>

      <SectionLabel label={t('word.play.turnOrder')} style={styles.section} />
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {round.order.map((id, i) => (
          <PlayerChip
            key={id}
            index={i + 1}
            name={playerById(id).name}
            accent={accent}
            active={!done && i === round.speakerIndex % players}
            done={done || i < round.speakerIndex % players}
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
      marginBottom: spacing.md,
    },
    // The spotlight is the one inverted block on the screen, so the eye lands
    // on whoever is speaking without needing a second colour.
    spotlight: {
      borderWidth: stroke.thick,
      backgroundColor: colors.ink,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    spotlightLabel: { ...type.caption, color: colors.onInk, textTransform: 'uppercase' },
    spotlightName: { ...type.hero, color: colors.onInk, marginTop: spacing.xs },
    spotlightArt: { marginTop: spacing.sm },
    section: { marginTop: 0 },
    list: { flex: 1 },
    action: { marginTop: spacing.sm },
  });
}
