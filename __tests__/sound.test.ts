/**
 * Every rule here is a bug that shipped.
 *
 * Playing without rewinding left each effect silent after its first use.
 * Waiting for a clip to be ready fixed that and made effects arrive seconds
 * late, under the next press. Rewinding from a playback-finished listener
 * restarted the clip it had just rewound, and the sound never stopped.
 * Rewinding a player that had never sounded — already at zero — cost the
 * first press of every effect, which is the silent first card of a game.
 * Deciding that from `currentTime` then cost every press *after* the first
 * on Android, where the property never left zero. Gating every press on
 * `isLoaded` cost every press after the first everywhere: on Android that
 * flag goes false again once a short clip finishes, so it was reread as
 * "still decoding" and dropped — every effect played exactly once, ever.
 * Decoded still wasn't audible: the first sound through a cold Android
 * audio route could be swallowed while the route itself opened, silencing
 * exactly one press — the very first one, on the very first launch.
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
    volume: 1,
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

    // `currentTime` is deliberately left at 0: Android reports that even for
    // a clip parked at its end, so the rewind may not depend on reading it.
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
    playSound('slam');
    await flush();
    // Late in its own waveform beats a button that makes no sound at all.
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('keeps rewinding on a device whose clock never leaves zero', async () => {
    const { playSound } = require('../src/native/sound');
    // Every press after the first must rewind, however the player reports
    // itself. Trusting `currentTime === 0` here replayed a finished clip
    // from its end — every button after the first went silent on Android.
    for (let i = 0; i < 4; i++) {
      playSound('chime');
      await flush();
    }
    expect(mockSeekTo).toHaveBeenCalledTimes(3);
    expect(mockPlay).toHaveBeenCalledTimes(4);
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

  it('keeps playing after the player reports isLoaded=false once it has already sounded', async () => {
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    await flush();
    expect(mockPlay).toHaveBeenCalledTimes(1);

    // Observed on a real device: a short clip flips `isLoaded` back to false
    // the moment it finishes, indistinguishable from "still decoding" unless
    // this module already knows the source played fine once before.
    state.isLoaded = false;
    playSound('slam');
    await flush();
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('never schedules anything on a timer once launched', async () => {
    // Preload's own warm-up timer (below) is the one exception, and it fires
    // once at launch, never in reaction to a press or to playback ending.
    jest.useFakeTimers();
    const { playSound } = require('../src/native/sound');
    playSound('slam');
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it('warms up every effect at launch with a silent, rewound play', () => {
    jest.useFakeTimers();
    const { createAudioPlayer } = require('expo-audio');
    const { preloadSounds } = require('../src/native/sound');
    preloadSounds();

    const created = createAudioPlayer.mock.results.map((r: { value: { volume: number } }) => r.value);
    expect(created).toHaveLength(6);
    // Muted and playing immediately — nothing here should be audible.
    expect(mockPlay).toHaveBeenCalledTimes(6);
    for (const player of created) expect(player.volume).toBe(0);

    jest.advanceTimersByTime(400);
    // Rewound and unmuted once the warm-up window passes, so the route is
    // already open by the time a real press comes in.
    expect(mockPause).toHaveBeenCalledTimes(6);
    expect(mockSeekTo).toHaveBeenCalledTimes(6);
    for (const player of created) expect(player.volume).toBe(1);
    jest.useRealTimers();
  });

  it('leaves an effect’s real first press unrewound after warming it up', () => {
    jest.useFakeTimers();
    const { preloadSounds, playSound } = require('../src/native/sound');
    preloadSounds();
    jest.advanceTimersByTime(400);
    mockPlay.mockClear();
    mockPause.mockClear();
    mockSeekTo.mockClear();

    playSound('slam');
    // The warm-up used the player, not this module's own record of what a
    // press has actually played — a real first press still takes the plain,
    // unrewound path, same as if there had been no warm-up at all.
    expect(mockPause).not.toHaveBeenCalled();
    expect(mockSeekTo).not.toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalledTimes(1);
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
