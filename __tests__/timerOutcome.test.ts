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
  it('wins when the impostor stops exactly on the target second', () => {
    const round = makeRound({ times: { impostor: 3000 } });
    expect(impostorNailedTimer(round)).toBe(true);
  });

  it('wins anywhere later in the same whole second, right up to the next tick', () => {
    const round = makeRound({ times: { impostor: 3999 } });
    expect(impostorNailedTimer(round)).toBe(true);
  });

  it('does not win a hair early — the second has not ticked over yet', () => {
    const round = makeRound({ times: { impostor: 2900 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });

  it('does not win the instant the next second ticks over', () => {
    const round = makeRound({ times: { impostor: 4000 } });
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
