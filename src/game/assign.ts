import { DRAWING_PROMPTS, WORD_PROMPTS } from '../i18n/prompts';
import {
  CANVAS_ROUNDS,
  Card,
  CanvasRound,
  GameMode,
  MafiaAssignment,
  MafiaConfig,
  MafiaRound,
  Player,
  Round,
  TimerRound,
  WordRound,
} from './types';

export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function createPlayer(index: number): Player {
  return { id: `p${Date.now().toString(36)}${index}${Math.random().toString(36).slice(2, 7)}`, name: '' };
}

// ---------------------------------------------------------------- Word / Canvas

function baseRound(players: Player[]) {
  const order = shuffle(players.map((p) => p.id));
  return { order, impostorId: pick(order) };
}

export function buildWordRound(players: Player[]): WordRound {
  const { order, impostorId } = baseRound(players);
  return { mode: 'word', prompt: pick(WORD_PROMPTS), impostorId, order, speakerIndex: 0 };
}

export function buildCanvasRound(players: Player[]): CanvasRound {
  const { order, impostorId } = baseRound(players);
  return {
    mode: 'canvas',
    prompt: pick(DRAWING_PROMPTS),
    impostorId,
    order,
    strokes: [],
    rounds: CANVAS_ROUNDS,
    canvas: null,
  };
}

// ---------------------------------------------------------------- Timer

const TIMER_MIN_MS = 1_000;
const TIMER_MAX_MS = 10_000;

export function buildTimerRound(players: Player[]): TimerRound {
  const { order, impostorId } = baseRound(players);
  // Quarter-second steps give the target some texture (6.25s, 6.75s) instead
  // of landing on a whole or half second every time.
  const targetMs = randomInt(TIMER_MIN_MS / 250, TIMER_MAX_MS / 250) * 250;
  // The impostor gets a deliberately loose window that always contains the target.
  const rangeMinMs = Math.max(1000, Math.floor((targetMs * 0.6) / 1000) * 1000);
  const rangeMaxMs = Math.ceil((targetMs * 1.4) / 1000) * 1000;
  return { mode: 'timer', targetMs, rangeMinMs, rangeMaxMs, impostorId, order, times: {} };
}

// ---------------------------------------------------------------- Mafia

/** Jacks for the mafia, one suit each so multiple mafiosi still hold distinct cards. */
const MAFIA_CARDS: Card[] = [
  { rank: 'J', suit: 'spades' },
  { rank: 'J', suit: 'clubs' },
  { rank: 'J', suit: 'hearts' },
  { rank: 'J', suit: 'diamonds' },
];
const DETECTIVE_CARD: Card = { rank: 'A', suit: 'hearts' };
const DOCTOR_CARD: Card = { rank: 'K', suit: 'diamonds' };
/** Nine distinct number cards — enough for the largest possible civilian pool. */
const CIVILIAN_CARDS: Card[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10'].map((rank) => ({
  rank,
  suit: 'clubs' as const,
}));

export const MAX_MAFIA = MAFIA_CARDS.length;

/** Largest mafia count that still leaves the town in the majority. */
export function maxMafiaFor(playerCount: number): number {
  return Math.max(1, Math.min(MAX_MAFIA, Math.floor((playerCount - 1) / 2)));
}

export function defaultMafiaConfig(playerCount: number): MafiaConfig {
  const config: MafiaConfig = {
    mafiaCount: playerCount <= 6 ? 1 : 2,
    detective: playerCount >= 4,
    doctor: playerCount >= 5,
  };
  return clampMafiaConfig(config, playerCount);
}

/** Keeps a config playable: within card supply and always leaving one civilian. */
export function clampMafiaConfig(config: MafiaConfig, playerCount: number): MafiaConfig {
  let mafiaCount = Math.min(Math.max(1, config.mafiaCount), maxMafiaFor(playerCount));
  let detective = config.detective;
  let doctor = config.doctor;
  // Special roles yield before the mafia count does.
  while (mafiaCount + (detective ? 1 : 0) + (doctor ? 1 : 0) > playerCount - 1) {
    if (doctor) doctor = false;
    else if (detective) detective = false;
    else mafiaCount -= 1;
  }
  return { mafiaCount, detective, doctor };
}

export function civiliansFor(config: MafiaConfig, playerCount: number): number {
  return playerCount - config.mafiaCount - (config.detective ? 1 : 0) - (config.doctor ? 1 : 0);
}

export function buildMafiaRound(players: Player[], rawConfig: MafiaConfig): MafiaRound {
  const config = clampMafiaConfig(rawConfig, players.length);
  const order = shuffle(players.map((p) => p.id));
  const seats = shuffle(order);
  const deal: Record<string, MafiaAssignment> = {};

  let seat = 0;
  for (let i = 0; i < config.mafiaCount; i++) {
    deal[seats[seat++]] = { role: 'mafia', card: MAFIA_CARDS[i] };
  }
  if (config.detective) deal[seats[seat++]] = { role: 'detective', card: DETECTIVE_CARD };
  if (config.doctor) deal[seats[seat++]] = { role: 'doctor', card: DOCTOR_CARD };

  const civilianCards = shuffle(CIVILIAN_CARDS);
  for (let i = 0; seat < seats.length; i++, seat++) {
    deal[seats[seat]] = { role: 'civilian', card: civilianCards[i] };
  }

  return { mode: 'mafia', order, deal };
}

// ---------------------------------------------------------------- Entry point

export function buildRound(mode: GameMode, players: Player[], mafiaConfig: MafiaConfig): Round {
  switch (mode) {
    case 'word':
      return buildWordRound(players);
    case 'canvas':
      return buildCanvasRound(players);
    case 'timer':
      return buildTimerRound(players);
    case 'mafia':
      return buildMafiaRound(players, mafiaConfig);
  }
}
