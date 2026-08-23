import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { useI18n } from '../i18n';
import { haptics } from '../native/haptics';
import { playSound } from '../native/sound';
import { useSkinTokens } from '../theme/SkinContext';
import { spacing, type } from '../theme/tokens';

type Stage = 'idle' | 3 | 2 | 1 | 'point' | 'ready';

const TICK_MS = 500;
const POINT_MS = 700;

/**
 * The one moment this app deliberately keeps IRL instead of building an
 * in-app vote: everyone points at their guess at the same instant, the same
 * way a table calls "3, 2, 1, point!" by hand. Shared by Word, Canvas, and
 * Timer, whose turn-by-turn phone-passing all end at this same beat. Mafia
 * already argues and votes out loud at the table, so it skips this.
 */
export function AccusationCountdown({
  revealLabel,
  testID,
  onReveal,
}: {
  revealLabel: string;
  testID?: string;
  onReveal: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stage, setStage] = useState<Stage>('idle');

  useEffect(() => {
    if (stage === 'idle' || stage === 'ready') return undefined;
    if (stage === 3 || stage === 2 || stage === 1) {
      haptics.medium();
      playSound('tick');
    } else {
      haptics.heavy();
      playSound('buzzer');
    }
    const next: Stage = stage === 3 ? 2 : stage === 2 ? 1 : stage === 1 ? 'point' : 'ready';
    const id = setTimeout(() => setStage(next), stage === 'point' ? POINT_MS : TICK_MS);
    return () => clearTimeout(id);
  }, [stage]);

  if (stage === 'idle') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.instruction}>{t('accuse.instruction')}</Text>
        <Button
          label={t('accuse.begin')}
          testID="accuse-begin"
          variant="primary"
          large
          onPress={() => setStage(3)}
          style={styles.action}
        />
      </View>
    );
  }

  if (stage === 'ready') {
    return <Button label={revealLabel} testID={testID} variant="danger" large onPress={onReveal} style={styles.action} />;
  }

  return (
    <View style={[styles.wrap, styles.countWrap]}>
      <Text style={styles.countdownNumber}>{stage === 'point' ? t('accuse.point') : stage}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'stretch', marginTop: spacing.sm },
    countWrap: { alignItems: 'center', paddingVertical: spacing.lg },
    instruction: {
      ...type.caption,
      color: colors.inkSoft,
      textAlign: 'center',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    countdownNumber: { ...type.hero, color: colors.ink, textAlign: 'center' },
    action: { marginTop: spacing.sm },
  });
}
