import { DRAWING_PROMPTS, WORD_PROMPTS } from '../i18n/prompts';
import {
  Card,
  CanvasRound,
  GameMode,
  MafiaAssignment,
  MafiaConfig,
  MafiaRound,
  Player,
  Round,
  RoundsConfig,
  Suit,
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

export function buildWordRound(players: Player[], rounds: number): WordRound {
  const { order, impostorId } = baseRound(players);
  return { mode: 'word', prompt: pick(WORD_PROMPTS), impostorId, order, speakerIndex: 0, rounds };
}

export function buildCanvasRound(players: Player[], rounds: number): CanvasRound {
  const { order, impostorId } = baseRound(players);
  return {
    mode: 'canvas',
    prompt: pick(DRAWING_PROMPTS),
    impostorId,
    order,
    strokes: [],
    rounds,
    canvas: null,
  };
}

// ---------------------------------------------------------------- Timer

const TIMER_MIN_MS = 1_000;
const TIMER_MAX_MS = 10_000;
const TIMER_STEP_MS = 1_000;

export function buildTimerRound(players: Player[], rounds: number): TimerRound {
  const { order, impostorId } = baseRound(players);
  // Whole-second targets only — like a real "stop it at 3 seconds" button
  // timer, the number everyone's chasing is always a round one.
  const targetMs = randomInt(TIMER_MIN_MS / TIMER_STEP_MS, TIMER_MAX_MS / TIMER_STEP_MS) * TIMER_STEP_MS;
  // The impostor gets a deliberately loose window that always contains the
  // target, rounded to the same whole-second step as the target itself.
  const rangeMinMs = Math.max(
    TIMER_STEP_MS,
    Math.floor((targetMs * 0.6) / TIMER_STEP_MS) * TIMER_STEP_MS,
  );
  const rangeMaxMs = Math.ceil((targetMs * 1.4) / TIMER_STEP_MS) * TIMER_STEP_MS;
  return { mode: 'timer', targetMs, rangeMinMs, rangeMaxMs, impostorId, order, times: {}, rounds, attempts: 0 };
}

/**
 * A real "stop the clock" win: like a physical countdown display, the number
 * only counts once the clock has actually ticked onto it. Landing anywhere
 * from the target's second up to (not including) the next one wins; arriving
 * even a hair early (2.9s for a 3s target) does not — there's no tolerance
 * window, just whichever whole second the press falls in.
 */
export function impostorNailedTimer(round: TimerRound): boolean {
  const impostorMs = round.times[round.impostorId];
  if (impostorMs === undefined) return false;
  return Math.floor(impostorMs / 1000) === Math.floor(round.targetMs / 1000);
}

// ---------------------------------------------------------------- Mafia

/** Jacks for the mafia, one suit each — capped at 3 so the killers always stay a minority clique. */
const MAFIA_CARDS: Card[] = [
  { rank: 'J', suit: 'spades' },
  { rank: 'J', suit: 'clubs' },
  { rank: 'J', suit: 'hearts' },
];
const DETECTIVE_CARD: Card = { rank: 'A', suit: 'hearts' };
const DOCTOR_CARD: Card = { rank: 'K', suit: 'diamonds' };
/**
 * Every standard rank/suit combo except the ones already claimed above, so up
 * to MAX_PLAYERS - 1 civilians (the largest possible pool, at 1 mafia and no
 * specials) each still get a distinct card. Clubs lead the order to keep the
 * usual small-table look, spilling into the other suits' number cards only
 * once a table is big enough to need them.
 */
const RESERVED_CARDS = [...MAFIA_CARDS, DETECTIVE_CARD, DOCTOR_CARD];
const ALL_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const ALL_SUITS: Suit[] = ['clubs', 'spades', 'hearts', 'diamonds'];
const CIVILIAN_CARDS: Card[] = ALL_SUITS.flatMap((suit) => ALL_RANKS.map((rank) => ({ rank, suit }))).filter(
  (c) => !RESERVED_CARDS.some((r) => r.rank === c.rank && r.suit === c.suit),
);

export const MAX_MAFIA = MAFIA_CARDS.length;

/** Largest mafia count that still leaves the town in the majority. */
export function maxMafiaFor(playerCount: number): number {
  return Math.max(1, Math.min(MAX_MAFIA, Math.floor((playerCount - 1) / 2)));
}

export function defaultMafiaConfig(playerCount: number): MafiaConfig {
  const config: MafiaConfig = {
    mafiaCount: playerCount <= 6 ? 1 : playerCount <= 10 ? 2 : 3,
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

export function buildRound(
  mode: GameMode,
  players: Player[],
  mafiaConfig: MafiaConfig,
  roundsConfig: RoundsConfig,
): Round {
  switch (mode) {
    case 'word':
      return buildWordRound(players, roundsConfig.word);
    case 'canvas':
      return buildCanvasRound(players, roundsConfig.canvas);
    case 'timer':
      return buildTimerRound(players, roundsConfig.timer);
    case 'mafia':
      return buildMafiaRound(players, mafiaConfig);
  }
}
