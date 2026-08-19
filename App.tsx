import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';

import { GameProvider } from './src/game/GameContext';
import { I18nProvider, useI18n } from './src/i18n';
import { GameRoot } from './src/screens/GameRoot';
import { SHELL } from './src/theme/tokens';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <I18nProvider>
        <GameProvider>
          <LocaleGate />
        </GameProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

/** Holds the console's plastic colour until the stored language resolves, so
 *  the app never flashes English before switching to the player's locale. */
function LocaleGate() {
  const { ready } = useI18n();
  if (!ready) return <View style={styles.splash} />;
  return <GameRoot />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: SHELL.body },
});
