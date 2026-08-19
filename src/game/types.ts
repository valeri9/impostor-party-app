import type { DrawingPrompt, WordPrompt } from '../i18n/prompts';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const DEFAULT_PLAYERS = 4;

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
  prompt: WordPrompt;
  impostorId: string;
  order: string[];
  speakerIndex: number;
};

export type CanvasRound = {
  mode: 'canvas';
  prompt: DrawingPrompt;
  impostorId: string;
  order: string[];
  strokes: Stroke[];
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
  /** playerId -> recorded milliseconds. Never surfaced before the results screen. */
  times: Record<string, number>;
};

export type MafiaRound = {
  mode: 'mafia';
  order: string[];
  deal: Record<string, MafiaAssignment>;
};

export type Round = WordRound | CanvasRound | TimerRound | MafiaRound;

export type GameState = {
  phase: Phase;
  mode: GameMode;
  players: Player[];
  mafiaConfig: MafiaConfig;
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
  | { type: 'START_GAME'; round: Round }
  | { type: 'NEXT_REVEAL' }
  | { type: 'ADD_STROKE'; stroke: Stroke }
  | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
  | { type: 'RECORD_TIME'; playerId: string; ms: number }
  | { type: 'NEXT_SPEAKER' }
  | { type: 'SHOW_RESULTS' }
  | { type: 'NEW_GAME'; round: Round }
  | { type: 'BACK_TO_SETUP' };
