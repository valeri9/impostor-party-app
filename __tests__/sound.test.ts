/**
 * The rule these guard: a press either sounds immediately or not at all.
 *
 * Both directions have been real bugs. Playing without rewinding left every
 * effect silent after its first use, because expo-audio parks a finished clip
 * at its end. Waiting for the clip to be ready fixed that and caused a worse
 * one — effects arriving seconds late, under whatever the player pressed next.
 */
const mockPlay = jest.fn();
const mockSeekTo = jest.fn(() => Promise.resolve());
const mockAddListener = jest.fn();
const state = { currentTime: 0, isLoaded: true, playing: false, duration: 0.42 };

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: mockPlay,
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
    jest.useRealTimers();
    mockPlay.mockReset();
    mockSeekTo.mockReset().mockImplementation(() => Promise.resolve());
    mockAddListener.mockReset();
    Object.assign(state, { currentTime: 0, isLoaded: true, playing: false, duration: 0.42 });
  });

  it('plays immediately, without waiting on anything', () => {
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    // Synchronously — not after a promise, a poll, or a timer.
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(mockSeekTo).not.toHaveBeenCalled();
  });

  it('drops a press while the clip is still decoding instead of firing it late', async () => {
    state.isLoaded = false;
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 80));
    state.isLoaded = true;
    await new Promise((resolve) => setTimeout(resolve, 80));
    // The press is gone, not queued — a late effect lands under the next screen.
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('restarts an effect that is still sounding rather than dropping the press', async () => {
    const { playSound } = require('../src/native/sound');
    playSound('tick');
    expect(mockPlay).toHaveBeenCalledTimes(1);

    // Pressed again mid-clip: it rewinds and fires again. Skipping repeats is
    // what left half the presses on a rapidly tapped stepper silent.
    state.playing = true;
    state.currentTime = 0.02;
    playSound('tick');
    await flush();
    expect(mockSeekTo).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('rewinds as soon as the clip ends, so the next press needs no seek', () => {
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    expect(mockAddListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));

    const onStatus = mockAddListener.mock.calls[0][1];
    state.currentTime = 0.42;
    onStatus({ didJustFinish: true });
    expect(mockSeekTo).toHaveBeenCalledWith(0);

    // Back at zero, the next press starts with no round-trip.
    state.currentTime = 0;
    mockPlay.mockClear();
    playSound('slam');
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('rewinds before replaying a clip left parked at its end', async () => {
    const { playSound } = require('../src/native/sound');
    state.currentTime = 0.42;
    playSound('slam');
    expect(mockPlay).not.toHaveBeenCalled(); // seek first
    await flush();
    expect(mockSeekTo).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalledTimes(1);
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
