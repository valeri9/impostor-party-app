import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Six one-shot effects, built once at launch and reused.
 *
 * The rule this file exists to keep: a press either sounds *now* or not at
 * all. Nothing here waits, retries, or queues. A late effect is worse than a
 * missing one — it lands on the next screen, under the next press, and reads
 * as the wrong sound playing at random.
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
const rewindTimers: Partial<Record<SoundName, ReturnType<typeof setTimeout>>> = {};
let audioModeReady = false;

function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  // Short effects should never interrupt whatever music the party is playing.
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  }).catch(() => {
    // Non-fatal: the default mode still produces sound on most devices.
  });
}

/**
 * expo-audio parks a finished clip at its end instead of rewinding it, so a
 * one-shot would play once and then be silent forever. Rewinding happens the
 * moment the clip ends — off the press path — so the next press finds the
 * player already at zero and can start it with no round-trip at all.
 */
function rewindWhenFinished(name: SoundName, player: AudioPlayer) {
  try {
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) rewind(name, player);
    });
  } catch {
    // No listener support: the timer below is the fallback.
  }
}

function rewind(name: SoundName, player: AudioPlayer) {
  clearTimeout(rewindTimers[name]);
  delete rewindTimers[name];
  player.seekTo(0).catch(() => {});
}

function playerFor(name: SoundName): AudioPlayer {
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
    rewindWhenFinished(name, player);
  }
  return player;
}

/**
 * Builds every player up front so the first press of a button is as loud as
 * the second. A player created at the moment of the press is still decoding
 * when `play()` is called, and that press is simply dropped.
 */
export function preloadSounds() {
  ensureAudioMode();
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      playerFor(name);
    } catch {
      // A device that cannot build the player still plays the game.
    }
  }
}

export function playSound(name: SoundName) {
  try {
    ensureAudioMode();
    const player = playerFor(name);

    // Still decoding: drop it. Waiting is what made effects arrive seconds
    // late, on top of whatever the player pressed next.
    if (!player.isLoaded) return;

    if (player.currentTime > 0 || player.playing) {
      // Mid-clip, or parked at its end before the finish handler ran. Rewind
      // and start again — chained, never fired side by side: `seekTo` is async,
      // and playing without waiting for it resumes from the end, silently.
      // A press always restarts the effect; dropping repeats is what made
      // half of them go unheard.
      player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => {});
      return;
    }

    player.play();

    // Belt and braces for the finish listener: if it never fires, this still
    // returns the player to zero so the next press is not silent.
    clearTimeout(rewindTimers[name]);
    const duration = player.duration > 0 ? player.duration * 1000 : 600;
    rewindTimers[name] = setTimeout(() => {
      if (!player.playing) rewind(name, player);
    }, duration + 150);
  } catch {
    // Ignore — sound is optional feedback.
  }
}

/** Release native resources when the app tears down its audio-using screens. */
export function releaseSounds() {
  for (const key of Object.keys(players) as SoundName[]) {
    clearTimeout(rewindTimers[key]);
    delete rewindTimers[key];
    try {
      players[key]?.remove();
    } catch {
      // Already released.
    }
    delete players[key];
  }
}
