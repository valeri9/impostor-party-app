---
name: run-app
description: Launches the Impostor Party Expo web app and drives it with a headless Chromium (via Playwright) to screenshot or interact with real screens. Use this whenever asked to run, screenshot, or visually verify a UI/theme/contrast change in this repo, instead of rediscovering the tooling from scratch.
---

# Running & driving Impostor Party

This is an Expo (React Native + web) app. There is no existing browser-test
setup in the repo, so this skill documents the recipe rather than pointing at
one.

## 1. Start the dev server

```bash
lsof -ti:8081 -sTCP:LISTEN || (cd /Users/valeri/Documents/Impostor_Party && npm run web -- --port 8081 &)
timeout 30 bash -c 'until curl -sf http://localhost:8081 >/dev/null; do sleep 1; done'
```

Port 8081 is Metro's default; `npm run web` is `expo start --web` (see
`package.json`). Stop it with `lsof -ti:8081 -sTCP:LISTEN | xargs -r kill` —
don't `pkill -f expo`, it can catch unrelated processes.

## 2. Drive it with Playwright

Playwright is a `devDependency` (added 2026-08-23, purely for this — it never
ships in the EAS build). `lib/withPage.js` in this skill's directory resolves
it from `node_modules` (falling back to the npx cache if it's ever removed)
and hands you a ready `page`:

```js
const { withPage } = require('/Users/valeri/Documents/Impostor_Party/.claude/skills/run-app/lib/withPage.js');

withPage(async (page) => {
  await page.goto('http://localhost:8081', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2000); // first paint on a cold Metro bundle can be slow
  await page.screenshot({ path: '/path/to/out.png' });
}).then(() => console.log('done'));
```

Run it with `node script.js`. If `withPage` throws "Playwright not found",
run `npx --yes playwright install chromium` once to repopulate the npx cache.

**View the screenshot with the Read tool** (it renders images) — don't just
assume it worked.

## 3. Skip onboarding without clicking through it

The app shows a first-launch "How to Play" gate (`GameRoot.tsx`) driven by
`AsyncStorage`, which on web is `localStorage`. Set the seen-flag *before*
`page.goto` navigates, via `page.addInitScript`, to land straight on Setup:

```js
await page.addInitScript(() => {
  localStorage.setItem('@impostor_party/seenHowToPlay', '1');
});
```

(Keys live in `src/native/storageKeys.ts` — check that file if they ever
change.) Skipping it this way is faster and more reliable than clicking
`[data-testid="howto-done"]` every run.

## 4. Screen map & testIDs

`GameRoot.tsx` is one linear state machine: `setup → reveal → play → results`,
with How-to-Play and the Skins catalogue as overlays outside that machine.
`react-native-web` renders `testID` as `data-testid`, so select with
`page.click('[data-testid="..."]')`.

| testID | Where | Notes |
|---|---|---|
| `howto-done` | How-to-Play | dismiss button (skip via localStorage instead, see §3) |
| `open-skins` | Setup (corner button) | opens the skin catalogue |
| `how-to-play` | Setup (corner button) | reopens How-to-Play |
| `skin-<id>` | Skins catalogue | select an **owned** skin card. IDs: `dmg-classic`, `neon-nebula`, `shoreline` |
| `skin-preview-<id>` | Skins catalogue | opens the full preview overlay for that skin |
| `skin-preview-select` / `-back` / `-locked` | Skin preview overlay | |
| `skins-done` | Skins catalogue | close catalogue, back to Setup |
| `start-game` | Setup | starts a round (disabled until every player is named) |
| `donate-link` | Setup | |
| `hold-target` / `shield` / `secret-content` | Reveal screen | the hold-to-reveal privacy gate |
| `mafia-clock` / `mafia-toggle` / `mafia-reset` | Mafia play screen | |
| `timer-start` / `timer-stop` / `timer-running` | Timer play screen | |
| `next-player` | Word/Canvas play screens | |
| `draw-canvas` / `canvas-pass` | Canvas play screen | |
| `show-results` | Mafia/Timer play screens | |

**All skins are unlocked in dev builds** (`SkinContext.tsx`'s
`baseOwnedIds()` — gated on `__DEV__ && NODE_ENV !== 'test'`), so `expo start
--web` never shows a paywall; every `skin-<id>` button is clickable directly.

## 5. After a visual change, verify both ways

Screenshots prove it *looks* right; they don't replace:

```bash
npx tsc --noEmit
npx jest
```

Run both — a passing screenshot with a broken type or a snapshot mismatch
elsewhere is still a broken change.
