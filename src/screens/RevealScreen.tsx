import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '../components/Button';
import { HoldToReveal } from '../components/HoldToReveal';
import { PlayingCard } from '../components/PlayingCard';
import { Screen } from '../components/Screen';
import { useGame } from '../game/GameContext';
import type { Round } from '../game/types';
import { localized, useI18n } from '../i18n';
import { colors, MODE_ACCENT, spacing, stroke, type } from '../theme/tokens';

/**
 * The single pass-and-play loop every mode goes through. It owns the player
 * cursor and the pass-along lock; modes only supply what the secret looks like.
 */
export function RevealScreen() {
  const { t } = useI18n();
  const { state, dispatch, playerById } = useGame();
  const round = state.round;
  const [unlocked, setUnlocked] = useState(false);

  // A fresh player means a fresh lock — never inherit the previous unlock.
  useEffect(() => setUnlocked(false), [state.revealIndex]);

  if (!round) return null;

  const playerId = round.order[state.revealIndex];
  const player = playerById(playerId);
  const accent = MODE_ACCENT[round.mode];

  return (
    <Screen>
      <Text style={styles.progress}>
        {t('reveal.progress', { current: state.revealIndex + 1, total: round.order.length })}
      </Text>

      <View style={styles.holdArea}>
        {/* Keyed per player so no hold state can carry over to the next one. */}
        <HoldToReveal
          key={playerId}
          playerName={player.name}
          accent={accent}
          onUnlocked={() => setUnlocked(true)}
        >
          <Secret round={round} playerId={playerId} />
        </HoldToReveal>
      </View>

      <Button
        label={t('reveal.next')}
        testID="next-player"
        variant="primary"
        large
        disabled={!unlocked}
        onPress={() => dispatch({ type: 'NEXT_REVEAL' })}
      />
    </Screen>
  );
}

/** Mode-specific secret. Only ever mounted while a finger is held down. */
function Secret({ round, playerId }: { round: Round; playerId: string }) {
  const { t, locale } = useI18n();
  const { width } = useWindowDimensions();

  switch (round.mode) {
    case 'word': {
      const isImpostor = playerId === round.impostorId;
      return isImpostor ? (
        <ImpostorSecret hint={localized(round.prompt.hint, locale)} />
      ) : (
        <View style={styles.secretBody}>
          <Text style={styles.secretLabel}>{t('secret.yourWord')}</Text>
          <Text style={styles.secretValue} adjustsFontSizeToFit numberOfLines={3}>
            {localized(round.prompt.exact, locale)}
          </Text>
          <Text style={styles.secretMeta}>{t(`category.${round.prompt.category}`)}</Text>
        </View>
      );
    }

    case 'canvas': {
      const isImpostor = playerId === round.impostorId;
      return isImpostor ? (
        <ImpostorSecret hint={localized(round.prompt.hint, locale)} />
      ) : (
        <View style={styles.secretBody}>
          <Text style={styles.secretLabel}>{t('secret.yourObject')}</Text>
          <Text style={styles.secretValue} adjustsFontSizeToFit numberOfLines={3}>
            {localized(round.prompt.exact, locale)}
          </Text>
        </View>
      );
    }

    case 'timer': {
      const isImpostor = playerId === round.impostorId;
      if (isImpostor) {
        return (
          <View style={styles.secretBody}>
            <View style={styles.impostorPlate}>
              <Text style={styles.impostorTitle} adjustsFontSizeToFit numberOfLines={2}>
                {t('secret.impostor')}
              </Text>
            </View>
            <Text style={styles.secretValue} adjustsFontSizeToFit numberOfLines={2}>
              {t('secret.targetRange', {
                min: (round.rangeMinMs / 1000).toFixed(2),
                max: (round.rangeMaxMs / 1000).toFixed(2),
              })}
            </Text>
            <Text style={styles.secretMeta}>{t('secret.timerImpostor')}</Text>
          </View>
        );
      }
      return (
        <View style={styles.secretBody}>
          <Text style={styles.secretValue} adjustsFontSizeToFit numberOfLines={2}>
            {t('secret.targetTime', { seconds: (round.targetMs / 1000).toFixed(2) })}
          </Text>
          <Text style={styles.secretMeta}>{t('secret.timerCivilian')}</Text>
        </View>
      );
    }

    case 'mafia': {
      const assignment = round.deal[playerId];
      return (
        <View style={styles.secretBody}>
          <Text style={styles.secretLabel}>{t('secret.yourCard')}</Text>
          <PlayingCard
            rank={assignment.card.rank}
            suit={assignment.card.suit}
            width={Math.min(width * 0.55, 230)}
            faceUp
            roleLabel={t(`role.${assignment.role}`)}
          />
        </View>
      );
    }
  }
}

function ImpostorSecret({ hint }: { hint: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.secretBody}>
      <View style={styles.impostorPlate}>
        <Text style={styles.impostorTitle} adjustsFontSizeToFit numberOfLines={2}>
          {t('secret.impostor')}
        </Text>
      </View>
      <View style={styles.hintBox}>
        <Text style={styles.hintLabel}>{t('secret.hint')}</Text>
        <Text style={styles.hintValue} adjustsFontSizeToFit numberOfLines={2}>
          {hint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: {
    ...type.caption,
    color: colors.inkSoft,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  holdArea: { flex: 1, marginBottom: spacing.md },
  secretBody: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, width: '100%' },
  secretLabel: { ...type.caption, color: colors.inkSoft, textTransform: 'uppercase' },
  secretValue: { ...type.hero, color: colors.ink, textAlign: 'center' },
  secretMeta: { ...type.caption, color: colors.inkSoft, textAlign: 'center' },
  // "You are the impostor" is inverted rather than red — the screen has no red.
  impostorPlate: {
    backgroundColor: colors.ink,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'stretch',
  },
  impostorTitle: { ...type.title, color: colors.onInk, textAlign: 'center', textTransform: 'uppercase' },
  hintBox: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: stroke.hair,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    width: '100%',
  },
  hintLabel: { ...type.caption, color: colors.inkSoft, marginBottom: spacing.xs, textTransform: 'uppercase' },
  hintValue: { ...type.heading, color: colors.ink, textAlign: 'center' },
});
