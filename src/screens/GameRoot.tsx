import React from 'react';

import { useGame } from '../game/GameContext';
import { ResultsScreen } from './ResultsScreen';
import { RevealScreen } from './RevealScreen';
import { SetupScreen } from './SetupScreen';
import { CanvasPlayScreen } from './play/CanvasPlayScreen';
import { MafiaTableScreen } from './play/MafiaTableScreen';
import { TimerPlayScreen } from './play/TimerPlayScreen';
import { WordPlayScreen } from './play/WordPlayScreen';

/** The whole app is one linear state machine: setup → reveal → play → results. */
export function GameRoot() {
  const { state } = useGame();

  switch (state.phase) {
    case 'setup':
      return <SetupScreen />;

    case 'reveal':
      return <RevealScreen />;

    case 'play': {
      const round = state.round;
      if (!round) return <SetupScreen />;
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
