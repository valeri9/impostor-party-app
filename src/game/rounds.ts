export type RoundProgress = {
  /** Total turns across every lap: players * rounds. */
  total: number;
  /** True once every lap has been completed. */
  done: boolean;
  /** Index into the player order for this turn — meaningless once done. */
  currentIndex: number;
  /** Which lap (1-based, clamped to rounds) this turn falls in. */
  currentRound: number;
};

/**
 * Shared "which turn, which lap" math for the three modes that repeat a pass
 * round the table a configurable number of times (Word's speakerIndex, the
 * Timer's attempt count, Canvas's stroke count).
 */
export function roundProgress(turn: number, players: number, rounds: number): RoundProgress {
  const total = players * rounds;
  return {
    total,
    done: turn >= total,
    currentIndex: turn % players,
    currentRound: Math.min(Math.floor(turn / players) + 1, rounds),
  };
}
