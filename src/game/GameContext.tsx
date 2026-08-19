import React, { createContext, useContext, useMemo, useReducer } from 'react';

import { buildRound } from './assign';
import { initialState, reducer } from './reducer';
import { Action, GameState, Player } from './types';

type GameValue = {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  /** Deals a fresh round for the current mode and enters the reveal loop. */
  startGame: () => void;
  /** Same roster, reshuffled roles. */
  newGame: () => void;
  playerById: (id: string) => Player;
  orderedPlayers: () => Player[];
};

const GameContext = createContext<GameValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const value = useMemo<GameValue>(() => {
    // Rounds are built here rather than in the reducer so the randomness stays
    // outside a function React may invoke more than once per dispatch.
    const deal = (type: 'START_GAME' | 'NEW_GAME') =>
      dispatch({ type, round: buildRound(state.mode, state.players, state.mafiaConfig) } as Action);

    return {
      state,
      dispatch,
      startGame: () => deal('START_GAME'),
      newGame: () => deal('NEW_GAME'),
      playerById: (id) =>
        state.players.find((p) => p.id === id) ?? { id, name: '?' },
      orderedPlayers: () =>
        (state.round?.order ?? state.players.map((p) => p.id)).map(
          (id) => state.players.find((p) => p.id === id) ?? { id, name: '?' },
        ),
    };
  }, [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
