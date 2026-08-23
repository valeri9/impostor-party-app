import { impostorNailedTimer, TIMER_WIN_TOLERANCE_MS } from '../src/game/assign';
import { TimerRound } from '../src/game/types';

function makeRound(overrides: Partial<TimerRound> = {}): TimerRound {
  return {
    mode: 'timer',
    targetMs: 4000,
    rangeMinMs: 2000,
    rangeMaxMs: 6000,
    impostorId: 'impostor',
    order: ['impostor', 'p2', 'p3'],
    times: {},
    rounds: 1,
    attempts: 0,
    ...overrides,
  };
}

describe('impostorNailedTimer', () => {
  it('wins when the impostor stops exactly on the target', () => {
    const round = makeRound({ times: { impostor: 4000 } });
    expect(impostorNailedTimer(round)).toBe(true);
  });

  it('wins within the tolerance, on either side of the target', () => {
    const under = makeRound({ times: { impostor: 4000 - TIMER_WIN_TOLERANCE_MS } });
    const over = makeRound({ times: { impostor: 4000 + TIMER_WIN_TOLERANCE_MS } });
    expect(impostorNailedTimer(under)).toBe(true);
    expect(impostorNailedTimer(over)).toBe(true);
  });

  it('loses just past the tolerance', () => {
    const round = makeRound({ times: { impostor: 4000 + TIMER_WIN_TOLERANCE_MS + 1 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });

  it('loses when the impostor never recorded a time', () => {
    const round = makeRound({ times: { p2: 4000 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });

  it('ignores everyone else\'s time, however close', () => {
    const round = makeRound({ times: { impostor: 9000, p2: 4000 } });
    expect(impostorNailedTimer(round)).toBe(false);
  });
});
