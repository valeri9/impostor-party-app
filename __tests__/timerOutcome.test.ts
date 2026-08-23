import { impostorNailedTimer } from '../src/game/assign';
import { TimerRound } from '../src/game/types';

function makeRound(overrides: Partial<TimerRound> = {}): TimerRound {
  return {
    mode: 'timer',
    targetMs: 3000,
    rangeMinMs: 2000,
    rangeMaxMs: 4000,
    impostorId: 'impostor',
    order: ['impostor', 'p2', 'p3'],
    times: {},
    rounds: 1,
    attempts: 0,
    ...overrides,
  };
}

describe('impostorNailedTimer', () => {
  it('wins by stopping exactly on the target (3.00s for a 3s target)', () => {
    const round = makeRound({ times: { impostor: 3000 } });
    expect(impostorNailedTimer(round)).toBe(true);
  });

  it('wins up to a hundredth of a second short of the target (2.99s)', () => {
    const round = makeRound({ times: { impostor: 2990 } });
    expect(impostorNailedTimer(round)).toBe(true);
  });

  it('does not win two hundredths short (2.98s) — outside the window', () => {
    const round = makeRound({ times: { impostor: 2980 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });

  it('does not win by even a hundredth over (3.01s) — overshoot never counts', () => {
    const round = makeRound({ times: { impostor: 3010 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });

  it('does not win far under the target', () => {
    const round = makeRound({ times: { impostor: 2000 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });

  it('loses when the impostor never recorded a time', () => {
    const round = makeRound({ times: { p2: 3000 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });

  it("ignores everyone else's time, however on-the-money", () => {
    const round = makeRound({ times: { impostor: 9000, p2: 3000 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });
});
