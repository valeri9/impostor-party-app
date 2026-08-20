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

export function playSound(name: SoundName) {
  void ensureAudioMode();
  try {
    let player = players[name];
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      players[name] = player;
    }
    player.seekTo(0);
    player.play();
  } catch {
    // Ignore — sound is optional feedback.
  }
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
