/**
 * The bug this guards: expo-audio parks a finished clip at its end instead of
 * rewinding it, so a one-shot effect played once stayed silent every time
 * after. `seekTo` is async, so playing without waiting for it restarts from
 * the end — audible on the first press of a button and never again.
 */
const mockPlay = jest.fn();
const mockSeekTo = jest.fn(() => Promise.resolve());
const state = { currentTime: 0, isLoaded: true };

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: mockPlay,
    seekTo: mockSeekTo,
    remove: jest.fn(),
    get currentTime() {
      return state.currentTime;
    },
    get isLoaded() {
      return state.isLoaded;
    },
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

/** Lets the fire-and-forget playback promise settle. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(() => resolve()));
};

describe('playSound', () => {
  beforeEach(() => {
    jest.resetModules();
    mockPlay.mockReset();
    mockSeekTo.mockReset().mockImplementation(() => Promise.resolve());
    state.currentTime = 0;
    state.isLoaded = true;
  });

  it('plays a fresh effect without a needless seek', async () => {
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    await flush();
    expect(mockSeekTo).not.toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('rewinds a finished effect before replaying it', async () => {
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    await flush();

    state.currentTime = 0.42; // parked at the end, the way expo-audio leaves it
    playSound('slam');
    await flush();

    expect(mockSeekTo).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('waits for the rewind to land before playing', async () => {
    const order: string[] = [];
    mockSeekTo.mockImplementation(() => {
      order.push('seek');
      return Promise.resolve();
    });
    mockPlay.mockImplementation(() => order.push('play'));

    const { playSound } = require('../src/native/sound');
    playSound('slam');
    await flush();
    state.currentTime = 0.42;
    playSound('slam');
    await flush();

    expect(order).toEqual(['play', 'seek', 'play']);
  });

  it('reuses one player per effect rather than building a new one each press', async () => {
    const { createAudioPlayer } = require('expo-audio');
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    playSound('slam');
    await flush();
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('waits for a clip that is still loading instead of dropping the press', async () => {
    state.isLoaded = false;
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    await flush();
    // Nothing yet — the clip has not finished decoding.
    expect(mockPlay).not.toHaveBeenCalled();

    state.isLoaded = true;
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('preloads every effect so the first press is not the one that loads it', async () => {
    const { createAudioPlayer } = require('expo-audio');
    const { preloadSounds } = require('../src/native/sound');
    preloadSounds();
    expect(createAudioPlayer).toHaveBeenCalledTimes(6);
  });
});
