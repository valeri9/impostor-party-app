# Impostor Party

A mobile-first, pass-and-play party game for **3–10 players sharing one phone**.
Four game modes, six languages, and a single privacy-first reveal loop that every
mode passes through.

Built with **Expo (React Native) + TypeScript**. Ships to Google Play as a signed
`.aab` via EAS Build — no local Android SDK or JDK required.

---

## Quick start

```bash
npm install
npm start          # then scan the QR code with Expo Go
```

Every dependency is Expo Go compatible, so the whole game is playable on a
physical device without building a dev client.

```bash
npm test           # integration tests for all four modes + prompt-library checks
npm run typecheck  # tsc --noEmit
npm run gen:audio  # regenerate assets/audio/*.wav
npm run gen:icons  # regenerate the pixel-art app icons
```

---

## Design: a Game Boy in your hand

Every screen is drawn as the handheld itself — grey plastic, the purple bezel
with its magenta-over-navy pinstripes and printed caption, the dot-matrix LCD
recessed into the front, and the wordmark below it.

`src/theme/tokens.ts` holds the whole design system, split the way the hardware
is. **Where a thing belongs decides how it is coloured: content is on the
screen, controls are on the shell.**

**`LCD` — inside the screen.** Strictly the four shades a DMG-01 could display
(`#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f`). Everything drawn there follows
from that:

- **No hues.** Modes used to carry an accent colour each; four shades leave none
  to spare, so they stay apart by name, emblem and layout instead.
- **No rounded corners, no blur, no gradients.** Square pixels only. There is no
  `radii` scale — just `stroke` weights for 1-bit borders.
- **Emphasis is inversion.** The speaking player, the selected mode and the
  impostor banner flip to an ink fill with light text, the way an 8-bit menu
  marked its cursor.
- **Illustrations are pixel grids.** `src/components/PixelArt.tsx` renders a
  string grid as square pixels — the padlock, the checkmark, the star and the
  clock are all defined that way, and `scripts/gen-icons.js` renders the same
  kind of grid into every launcher icon.

**`SHELL` — the console around it.** This is where the colour lives: the grey
body, the purple bezel and its pinstripes, the navy print, the crimson A/B
buttons and the battery LED. Buttons are hardware, so they are moulded in those
colours — crimson for the affirmative actions, navy for the ones that end a
round — and the blind timer's big round Start/Stop targets are the A and B
buttons themselves.

Type throughout is a blocky monospace (`Menlo` / `monospace`), uppercased via
`textTransform` in styles rather than in the strings, so the dictionary text
stays exactly what the translator wrote.

Playing cards stay on the screen side, printed in the four greens: red suits in
the mid green, black suits in ink.

---

## The universal hide & reveal system

`src/components/HoldToReveal.tsx` is the one component every mode routes through.
It enforces three rules:

1. **Conditional rendering, not covering.** The secret is mounted only while a
   finger is down (`{held ? children : <Shield/>}`), so releasing cannot leave a
   readable frame behind.
2. **Any loss of touch hides it** — release, gesture cancel, or the app being
   backgrounded (an `AppState` listener guards against app-switcher snapshots).
3. **Next Player lock.** The pass-along button stays disabled until a sustained
   200 ms hold, so the phone is never handed over with a secret on screen.

`RevealScreen` owns the player cursor and is keyed per player, so no hold state
can carry from one player to the next. Modes only supply what the secret *looks*
like — none of them implement revealing themselves.

---

## Feel: sound, haptics, motion

Every tappable surface answers immediately, the way real plastic would:

- **Press = squash.** Buttons, D-pad steppers, the toggle switch, language
  chips, mode cards and colour swatches all shrink slightly under the finger
  and spring back on release (`src/components/pressAnim.ts`), instead of only
  swapping a background colour.
- **Every action has a matching sound**, synthesized deterministically by
  `scripts/gen-audio.js` — no binary assets committed. `click` for buttons,
  `tick` for steppers/toggles/chips/the pencil touching the canvas, `chime`
  for a locked-in stroke or a stopped timer, `buzzer` for the Mafia clock
  running out, and `pop` for the two payoff moments: a hold clearing and the
  impostor's name landing on the results screen.
- **The secret unfolds, it doesn't just appear.** `HoldToReveal` springs the
  revealed content in on press, and the impostor banner on the results screen
  pops in with a haptic and a `pop` — the one moment in the game worth a
  little fanfare.
- **Haptics accompany all of the above** (`src/native/haptics.ts`), Light for
  a tick, Medium for a press, Heavy for a big commit, Success for a payoff —
  with a `navigator.vibrate` fallback on web.

---

## Game modes

| Mode | Civilians see | Impostor sees | Play phase |
|---|---|---|---|
| **Classic Word** | The exact secret word | `YOU ARE THE IMPOSTOR` + an adjacent category hint | Turn order, one word each |
| **One-Stroke Drawing** | The exact object | `YOU ARE THE IMPOSTOR` + a close-category hint | One continuous line each; lifting the finger locks the stroke |
| **Blind Intuition Timer** | An exact target time | A widened range that always contains the target | Sequential blind attempts — no digits are rendered at any point while running |
| **Digital Mafia** | Their own playing card | — | On-screen round timer for the table game |

**Mafia roles are fully configurable**: a stepper for the mafia count plus
Detective and Doctor switches, seeded with defaults that scale to the player
count and always leave at least one civilian.

Card mapping: Mafia `J` (one suit each), Detective `A♥`, Doctor `K♦`, civilians
distinct number cards `2♣`–`10♣`. Cards are drawn as real SVG — patterned back,
corner indices top-left and rotated bottom-right, standard pip layouts.

---

## Languages

English, Bulgarian, Spanish, Greek, German, Romanian.

Three files, split by what a translator would work on at a time:

| File | Holds |
|---|---|
| `src/i18n/dictionary.json` | 103 UI keys per locale |
| `src/i18n/words.json` | 300 word prompts, 30 in each of 10 categories |
| `src/i18n/drawings.json` | 300 drawing prompts |

Every prompt carries an `exact`/`hint` pair in all six languages side by side —
the secret the civilians get, and the broader, adjacent description the impostor
gets instead. Missing UI keys fall back to English at runtime.

Word categories: food, places, animals, objects, activities, nature, jobs,
transport, sports, entertainment.

`__tests__/prompts.test.ts` guards the library as a whole — no missing
translation in any language, no hint that accidentally repeats its own secret,
no duplicate entries, a label for every category, and an even split across them.
A play-through test would only ever sample one random prompt, so these run over
all 600.

The language is detected from the device on first launch and persisted after
that. `src/i18n/prompts.ts` holds the data with no React dependency, so the game
logic in `src/game/` is testable in plain Node.

---

## Project layout

```
App.tsx                     providers + locale gate
src/game/                   types, reducer (the state machine), role assignment
src/i18n/                   dictionary.json (UI), words/drawings.json, runtime t()
src/components/             HoldToReveal, PlayingCard, DrawCanvas, Button, …
src/screens/                Setup → Reveal → play/* → Results
src/native/                 haptics + sound wrappers (safe no-ops on failure)
scripts/gen-audio.js        regenerates the WAV effects deterministically
```

The whole app is one linear state machine (`setup → reveal → play → results`)
driven by `useReducer`; there is no navigation library.

---

## Building for the Play Store

EAS builds in the cloud, so no local Android toolchain is needed.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production   # produces the .aab
eas submit --platform android                        # optional, uploads to Play
```

`eas.json` also defines a `preview` profile that produces an installable APK for
sideloaded testing.

Before the first production build, set your own `extra.eas.projectId` (EAS adds
this on first run) and bump `android.versionCode` in `app.json` for each release
— or leave `autoIncrement` in the production profile to handle it.

iOS uses the same `com.impostorparty.app` identifier and is ready for
`eas build --platform ios` when you add an Apple account.
