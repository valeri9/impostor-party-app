import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Six one-shot effects, built once at launch and reused.
 *
 * Two rules, both learned the hard way:
 *
 * 1. A press sounds *now* or not at all. Nothing here waits, retries or
 *    queues — a late effect lands on the next screen, under the next press,
 *    and reads as the wrong sound firing at random.
 * 2. Nothing reacts to playback *ending*. Rewinding a finished clip from a
 *    status listener restarts it, which finishes, which rewinds… and the
 *    effect never stops. Every rewind here is driven by a press.
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

    // A player that has never sounded is already parked at zero, so rewinding
    // it is pure risk: the first `seekTo` on a freshly prepared player can
    // reject, and the `play` chained behind it then never runs. That is the
    // silent first card — and why every card after it was fine.
    if (!player.playing && player.currentTime === 0) {
      player.play();
      return;
    }

    // Otherwise stop, rewind, play — in that order, every time. expo-audio
    // parks a finished clip at its end rather than rewinding it, and `seekTo`
    // is async, so the play has to be chained to it: firing both side by side
    // resumes from the end and is silent. Pausing first means a seek can
    // never hand playback back to a clip that was already running.
    player.pause();
    player
      .seekTo(0)
      .then(() => player.play())
      // A refused seek must not swallow the press too — better a clip that
      // starts late in its own waveform than a button with no sound at all.
      .catch(() => player.play());
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
