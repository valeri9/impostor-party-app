import { createPlayer } from './assign';
import {
  Action,
  DEFAULT_PLAYERS,
  DEFAULT_ROUNDS,
  GameState,
  MAX_PLAYERS,
  MAX_ROUNDS,
  MIN_PLAYERS,
  MIN_ROUNDS,
  Player,
} from './types';

function initialPlayers(): Player[] {
  return Array.from({ length: DEFAULT_PLAYERS }, (_, i) => createPlayer(i));
}

export function initialState(): GameState {
  return {
    phase: 'setup',
    mode: null,
    players: initialPlayers(),
    mafiaConfig: { mafiaCount: 1, detective: true, doctor: false },
    roundsConfig: { ...DEFAULT_ROUNDS },
    round: null,
    revealIndex: 0,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_PLAYER_NAME':
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.id ? { ...p, name: action.name } : p)),
      };

    case 'ADD_PLAYER':
      if (state.players.length >= MAX_PLAYERS) return state;
      return { ...state, players: [...state.players, createPlayer(state.players.length)] };

    case 'REMOVE_PLAYER':
      if (state.players.length <= MIN_PLAYERS) return state;
      return { ...state, players: state.players.filter((p) => p.id !== action.id) };

    case 'SET_MAFIA_CONFIG':
      return { ...state, mafiaConfig: action.config };

    case 'SET_ROUNDS': {
      const rounds = Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, action.rounds));
      return { ...state, roundsConfig: { ...state.roundsConfig, [action.mode]: rounds } };
    }

    case 'START_GAME':
    case 'NEW_GAME':
      return { ...state, phase: 'reveal', round: action.round, revealIndex: 0 };

    case 'NEXT_REVEAL': {
      if (!state.round) return state;
      const next = state.revealIndex + 1;
      // The last confirmation rolls straight into the play phase.
      if (next >= state.round.order.length) return { ...state, phase: 'play', revealIndex: next };
      return { ...state, revealIndex: next };
    }

    case 'ADD_STROKE': {
      if (state.round?.mode !== 'canvas') return state;
      return { ...state, round: { ...state.round, strokes: [...state.round.strokes, action.stroke] } };
    }

    case 'SET_CANVAS_SIZE': {
      if (state.round?.mode !== 'canvas') return state;
      const canvas = state.round.canvas;
      // Set once — later layout passes must not invalidate recorded strokes.
      if (canvas) return state;
      return { ...state, round: { ...state.round, canvas: { width: action.width, height: action.height } } };
    }

    case 'RECORD_TIME': {
      if (state.round?.mode !== 'timer') return state;
      return {
        ...state,
        round: {
          ...state.round,
          times: { ...state.round.times, [action.playerId]: action.ms },
          attempts: state.round.attempts + 1,
        },
      };
    }

    case 'NEXT_SPEAKER': {
      if (state.round?.mode !== 'word') return state;
      const total = state.round.order.length * state.round.rounds;
      const speakerIndex = Math.min(state.round.speakerIndex + 1, total);
      return { ...state, round: { ...state.round, speakerIndex } };
    }

    case 'SHOW_RESULTS':
      return { ...state, phase: 'results' };

    case 'BACK_TO_SETUP':
      return { ...state, phase: 'setup', round: null, revealIndex: 0 };

    default:
      return state;
  }
}
