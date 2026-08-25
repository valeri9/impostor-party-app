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
 * 3. `isLoaded` only means "still decoding" *before* the first successful
 *    play. On Android it goes false again the moment a short clip reaches
 *    its end — checking it on every press read "just finished" as "not
 *    ready" and made every effect play exactly once, ever.
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
/** Effects that have played at least once, and so need rewinding before the next press. */
const sounded = new Set<SoundName>();
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

    // The first press of an effect just plays: the player has never sounded,
    // so it is already at zero, and the first `seekTo` on a freshly prepared
    // native player can be refused — which killed the `play` chained behind
    // it and made the first card of a game silent.
    //
    // Whether it has sounded is tracked here, not read back from the player.
    // `currentTime` stayed at 0 on Android for a clip parked at its end, and
    // `isLoaded` — checked here on every press, not just the first — turned
    // out to go false on Android the moment a short clip finishes, which is
    // indistinguishable from "still decoding" without this flag. Trusting it
    // past the first press meant every effect played exactly once, ever.
    if (!sounded.has(name)) {
      // Still decoding: drop it. Waiting is what made effects arrive seconds
      // late, on top of whatever the player pressed next. This check only
      // applies here, before anything has proven the source decoded fine.
      if (!player.isLoaded) return;
      sounded.add(name);
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
    sounded.delete(key);
  }
}
