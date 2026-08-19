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
npm test           # 14 integration tests covering all four modes
npm run typecheck  # tsc --noEmit
npm run gen:audio  # regenerate assets/audio/*.wav
npm run gen:icons  # regenerate the pixel-art app icons
```

---

## Design: a Game Boy in your hand

Every screen is drawn as the handheld itself — a dark plastic shell with the
printed caption below it, and a dot-matrix LCD panel recessed into the front.

`src/theme/tokens.ts` is the whole design system, and it is deliberately
constrained to what a **DMG-01 could actually display: four shades of one olive
green** (`#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f`). Everything else follows
from that:

- **No hues.** Modes used to carry an accent colour each; a four-shade screen has
  none to spare, so they stay apart by name, emblem and layout instead.
- **No rounded corners, no blur, no gradients.** Square pixels only. There is no
  `radii` scale — just `stroke` weights for 1-bit borders.
- **Emphasis is inversion.** The speaking player, the selected mode, the impostor
  banner and a pressed button all flip to an ink fill with light text, the way an
  8-bit menu marked its cursor.
- **Illustrations are pixel grids.** `src/components/PixelArt.tsx` renders a
  string grid as square pixels — the padlock, the checkmark, the star and the
  clock are all defined that way, and `scripts/gen-icons.js` renders the same
  kind of grid into every launcher icon.
- **Type is a blocky monospace** (`Menlo` / `monospace`), uppercased through
  `textTransform` in styles rather than in the strings, so the dictionary text
  stays exactly what the translator wrote.

Playing cards are drawn in the same four shades: red suits print in the mid
green, black suits in ink.

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
   600 ms hold, so the phone is never handed over with a secret on screen.

`RevealScreen` owns the player cursor and is keyed per player, so no hold state
can carry from one player to the next. Modes only supply what the secret *looks*
like — none of them implement revealing themselves.

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

`src/i18n/dictionary.json` holds everything in one file: 97 UI keys per locale
plus 15 word prompts and 12 drawing pairs, each with an `exact`/`hint` pair in
all six languages side by side. Missing keys fall back to English at runtime.

The language is detected from the device on first launch and persisted after
that. `src/i18n/prompts.ts` holds the data with no React dependency, so the game
logic in `src/game/` is testable in plain Node.

---

## Project layout

```
App.tsx                     providers + locale gate
src/game/                   types, reducer (the state machine), role assignment
src/i18n/                   dictionary.json, runtime t(), prompt data
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
