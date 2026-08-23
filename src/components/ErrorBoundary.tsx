import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { PIXEL_WARN, PixelArt } from './PixelArt';
import { Screen } from './Screen';
import { useI18n } from '../i18n';
import { useSkinTokens } from '../theme/SkinContext';
import { spacing, type } from '../theme/tokens';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Catches render-time errors anywhere in the game tree so one bug doesn't
 * white-screen the whole app with no way back. Sits inside SkinProvider/
 * I18nProvider but outside GameProvider's own screen switching, so a reset
 * only remounts the current screen — players, settings, and the active skin
 * survive it.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // No crash-reporting SDK by design — Play Console's own Android Vitals
    // covers this on real devices without adding a network dependency.
    if (__DEV__) console.error(error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) return <ErrorFallback onRestart={this.reset} />;
    return this.props.children;
  }
}

function ErrorFallback({ onRestart }: { onRestart: () => void }) {
  const { t } = useI18n();
  const { colors } = useSkinTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Screen center>
      <View style={styles.art}>
        <PixelArt rows={PIXEL_WARN} size={64} />
      </View>
      <Text style={styles.title}>{t('error.title')}</Text>
      <Text style={styles.body}>{t('error.body')}</Text>
      <Button label={t('error.restart')} testID="error-restart" variant="primary" large onPress={onRestart} style={styles.action} />
    </Screen>
  );
}

function createStyles(colors: ReturnType<typeof useSkinTokens>['colors']) {
  return StyleSheet.create({
    art: { marginBottom: spacing.md },
    title: { ...type.title, color: colors.ink, textAlign: 'center', textTransform: 'uppercase' },
    body: {
      ...type.caption,
      color: colors.inkSoft,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    action: { alignSelf: 'stretch' },
  });
}
