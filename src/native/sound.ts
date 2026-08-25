import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Two one-shot effects, created lazily and reused. Audio is a garnish here, so
 * every call is failure-tolerant — a device that cannot play still plays the game.
 */

const SOURCES = {
  buzzer: require('../../assets/audio/buzzer.wav'),
  chime: require('../../assets/audio/chime.wav'),
  click: require('../../assets/audio/click.wav'),
  tick: require('../../assets/audio/tick.wav'),
  pop: require('../../assets/audio/pop.wav'),
  slam: require('../../assets/audio/slam.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    // Short effects should never interrupt whatever music the party is playing.
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    // Non-fatal: the default mode still produces sound on most devices.
  }
}

function playerFor(name: SoundName): AudioPlayer {
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
  }
  return player;
}

/**
 * Builds every player up front so the first press of a button is as loud as
 * the second. A player created at the moment of the press is still fetching
 * its clip when `play()` is called, and that first effect is simply lost.
 */
export function preloadSounds() {
  void ensureAudioMode();
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      playerFor(name);
    } catch {
      // A device that cannot build the player still plays the game.
    }
  }
}

export function playSound(name: SoundName) {
  void ensureAudioMode();
  void (async () => {
    try {
      const player = playerFor(name);
      // expo-audio leaves a finished clip parked at its end rather than
      // rewinding it, so a one-shot plays once and is silent every time after
      // unless the position is reset. `seekTo` is async: calling `play()`
      // without waiting for it restarts from the end, which is the silence.
      if (player.currentTime > 0) await player.seekTo(0);
      player.play();
    } catch {
      // Ignore — sound is optional feedback.
    }
  })();
}

/** Release native resources when the app tears down its audio-using screens. */
export function releaseSounds() {
  for (const key of Object.keys(players) as SoundName[]) {
    try {
      players[key]?.remove();
    } catch {
      // Already released.
    }
    delete players[key];
  }
}
