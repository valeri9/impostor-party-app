/**
 * Every rule here is a bug that shipped.
 *
 * Playing without rewinding left each effect silent after its first use.
 * Waiting for a clip to be ready fixed that and made effects arrive seconds
 * late, under the next press. Rewinding from a playback-finished listener
 * restarted the clip it had just rewound, and the sound never stopped.
 * Rewinding a player that had never sounded — already at zero — cost the
 * first press of every effect, which is the silent first card of a game.
 */
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockSeekTo = jest.fn(() => Promise.resolve());
const mockAddListener = jest.fn();
const state = { currentTime: 0, isLoaded: true, playing: false, duration: 0.42 };

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: mockPlay,
    pause: mockPause,
    seekTo: mockSeekTo,
    addListener: mockAddListener,
    remove: jest.fn(),
    get currentTime() {
      return state.currentTime;
    },
    get isLoaded() {
      return state.isLoaded;
    },
    get playing() {
      return state.playing;
    },
    get duration() {
      return state.duration;
    },
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(() => resolve()));
};

describe('playSound', () => {
  beforeEach(() => {
    jest.resetModules();
    mockPlay.mockReset();
    mockPause.mockReset();
    mockSeekTo.mockReset().mockImplementation(() => Promise.resolve());
    mockAddListener.mockReset();
    Object.assign(state, { currentTime: 0, isLoaded: true, playing: false, duration: 0.42 });
  });

  it('never listens for playback ending', () => {
    const { playSound, preloadSounds } = require('../src/native/sound');
    preloadSounds();
    playSound('slam');
    // A listener that rewinds a finished clip restarts it, and the effect
    // loops forever. Nothing in this module may react to playback ending.
    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('plays the first press outright, without rewinding first', () => {
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    // A player that has never sounded is already at zero. Seeking it anyway
    // risks a rejection that swallows the play chained behind it — the
    // silent first card.
    expect(mockSeekTo).not.toHaveBeenCalled();
    expect(mockPause).not.toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('stops and rewinds before replaying a clip that has already sounded', async () => {
    const { playSound } = require('../src/native/sound');
    playSound('slam');

    state.currentTime = 0.42; // parked at the end, where expo-audio leaves it
    playSound('slam');
    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(mockSeekTo).toHaveBeenCalledWith(0);
    // Chained, not fired alongside: playing before the seek lands resumes
    // from the end of the clip and is silent.
    expect(mockPlay).toHaveBeenCalledTimes(1);
    await flush();
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('still plays when the rewind is refused', async () => {
    mockSeekTo.mockImplementation(() => Promise.reject(new Error('not seekable')));
    const { playSound } = require('../src/native/sound');
    playSound('slam');

    state.currentTime = 0.42;
    playSound('slam');
    await flush();
    // Late in its own waveform beats a button that makes no sound at all.
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('restarts an effect that is still sounding rather than dropping the press', async () => {
    const { playSound } = require('../src/native/sound');
    playSound('tick');
    await flush();

    state.playing = true;
    state.currentTime = 0.02;
    playSound('tick');
    await flush();
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('drops a press while the clip is still decoding instead of firing it late', async () => {
    state.isLoaded = false;
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    await flush();
    state.isLoaded = true;
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('never schedules anything on a timer', async () => {
    jest.useFakeTimers();
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it('reuses one player per effect rather than building a new one each press', () => {
    const { createAudioPlayer } = require('expo-audio');
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    playSound('slam');
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('preloads every effect so the first press is not the one that decodes it', () => {
    const { createAudioPlayer } = require('expo-audio');
    const { preloadSounds } = require('../src/native/sound');
    preloadSounds();
    expect(createAudioPlayer).toHaveBeenCalledTimes(6);
  });
});
