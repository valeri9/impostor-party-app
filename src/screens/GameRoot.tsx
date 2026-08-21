import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGame } from '../game/GameContext';
import { HOWTO_SEEN_KEY } from '../native/storageKeys';
import { SHELL } from '../theme/tokens';
import { HowToPlayScreen } from './HowToPlayScreen';
import { ResultsScreen } from './ResultsScreen';
import { RevealScreen } from './RevealScreen';
import { SetupScreen } from './SetupScreen';
import { CanvasPlayScreen } from './play/CanvasPlayScreen';
import { MafiaTableScreen } from './play/MafiaTableScreen';
import { TimerPlayScreen } from './play/TimerPlayScreen';
import { WordPlayScreen } from './play/WordPlayScreen';

/** The whole app is one linear state machine: setup → reveal → play → results.
 *  How-to-play sits outside that machine — it's not game state, just a gate
 *  shown before setup on first launch and reachable again from a button there. */
export function GameRoot() {
  const { state } = useGame();
  // null = "still checking storage", so the setup screen never flashes
  // before we know whether onboarding should show first.
  const [showHowTo, setShowHowTo] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let seen: string | null = null;
      try {
        seen = await AsyncStorage.getItem(HOWTO_SEEN_KEY);
      } catch {
        // Storage is best-effort; default to showing it once.
      }
      if (!cancelled) setShowHowTo(!seen);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissHowTo = useCallback(() => {
    setShowHowTo(false);
    AsyncStorage.setItem(HOWTO_SEEN_KEY, '1').catch(() => {
      // Persisting the "seen it" flag is a convenience, not a requirement.
    });
  }, []);

  const openHowTo = useCallback(() => setShowHowTo(true), []);

  if (showHowTo === null) return <View style={styles.splash} />;
  if (showHowTo) return <HowToPlayScreen onDismiss={dismissHowTo} />;

  switch (state.phase) {
    case 'setup':
      return <SetupScreen onHowToPlay={openHowTo} />;

    case 'reveal':
      return <RevealScreen />;

    case 'play': {
      const round = state.round;
      if (!round) return <SetupScreen onHowToPlay={openHowTo} />;
      switch (round.mode) {
        case 'word':
          return <WordPlayScreen round={round} />;
        case 'canvas':
          return <CanvasPlayScreen round={round} />;
        case 'timer':
          return <TimerPlayScreen round={round} />;
        case 'mafia':
          return <MafiaTableScreen round={round} />;
      }
    }

    case 'results':
      return <ResultsScreen />;
  }
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: SHELL.body },
});
