import type { Prompt } from '../i18n/prompts';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 15;
export const DEFAULT_PLAYERS = 4;
/** Mafia needs enough of a town for the social deduction to work — 3 is too
 *  small to hide a Mafia member in. */
export const MAFIA_MIN_PLAYERS = 5;

/** Modes whose play screen repeats a pass round the table a configurable number of times. */
export type RoundedMode = 'word' | 'canvas' | 'timer';
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 5;
export const DEFAULT_ROUNDS: Record<RoundedMode, number> = { word: 1, canvas: 2, timer: 1 };
export type RoundsConfig = Record<RoundedMode, number>;

export type GameMode = 'word' | 'canvas' | 'timer' | 'mafia';
export const GAME_MODES: GameMode[] = ['word', 'canvas', 'timer', 'mafia'];

export type Phase = 'setup' | 'reveal' | 'play' | 'results';

export type Player = { id: string; name: string };

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Card = { rank: string; suit: Suit };

export type MafiaRole = 'mafia' | 'detective' | 'doctor' | 'civilian';
export type MafiaConfig = { mafiaCount: number; detective: boolean; doctor: boolean };
export type MafiaAssignment = { role: MafiaRole; card: Card };

/** A single locked drawing stroke, one per player. */
export type Stroke = { playerId: string; color: string; d: string };

export type WordRound = {
  mode: 'word';
  prompt: Prompt;
  impostorId: string;
  order: string[];
  /** Counts up across every lap; the current speaker is order[speakerIndex % order.length]. */
  speakerIndex: number;
  /** How many times the phone goes round the table before results. */
  rounds: number;
};

export type CanvasRound = {
  mode: 'canvas';
  prompt: Prompt;
  impostorId: string;
  order: string[];
  strokes: Stroke[];
  /** How many times the phone goes round the table; one stroke per player per round. */
  rounds: number;
  /** Pixel size of the drawing surface, so the result can be replayed undistorted. */
  canvas: { width: number; height: number } | null;
};

export type TimerRound = {
  mode: 'timer';
  targetMs: number;
  rangeMinMs: number;
  rangeMaxMs: number;
  impostorId: string;
  order: string[];
  /** playerId -> most recently recorded milliseconds. Never surfaced before results. */
  times: Record<string, number>;
  /** How many times the phone goes round the table; only the last attempt per player counts. */
  rounds: number;
  /** Total RECORD_TIME calls so far — the turn cursor, since `times` overwrites per player. */
  attempts: number;
};

export type MafiaRound = {
  mode: 'mafia';
  order: string[];
  deal: Record<string, MafiaAssignment>;
};

export type Round = WordRound | CanvasRound | TimerRound | MafiaRound;

export type GameState = {
  phase: Phase;
  /** null until the player picks one on the setup screen — nothing is preselected at launch. */
  mode: GameMode | null;
  players: Player[];
  mafiaConfig: MafiaConfig;
  roundsConfig: RoundsConfig;
  round: Round | null;
  /** Index into round.order for the universal reveal loop. */
  revealIndex: number;
};

export type Action =
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_PLAYER_NAME'; id: string; name: string }
  | { type: 'ADD_PLAYER' }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'SET_MAFIA_CONFIG'; config: MafiaConfig }
  | { type: 'SET_ROUNDS'; mode: RoundedMode; rounds: number }
  | { type: 'START_GAME'; round: Round }
  | { type: 'NEXT_REVEAL' }
  | { type: 'ADD_STROKE'; stroke: Stroke }
  | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
  | { type: 'RECORD_TIME'; playerId: string; ms: number }
  | { type: 'NEXT_SPEAKER' }
  | { type: 'SHOW_RESULTS' }
  | { type: 'NEW_GAME'; round: Round }
  | { type: 'BACK_TO_SETUP' };
