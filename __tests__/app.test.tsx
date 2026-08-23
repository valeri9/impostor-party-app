import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from '../App';
import { LOCALES, translate } from '../src/i18n';
import { ACTIVE_SKIN_KEY, HOWTO_SEEN_KEY, OWNED_SKINS_KEY } from '../src/native/storageKeys';

// The point-at-the-impostor countdown (see pointAtImpostor below) runs on
// real timers for ~2.2s; give those tests headroom over Jest's 5s default.
jest.setTimeout(15000);

const DEFAULT_NAMES = ['Ana', 'Bo', 'Cid', 'Dee'];
// Mafia needs MAFIA_MIN_PLAYERS (5) — one more than the default roster.
const MAFIA_NAMES = ['Ana', 'Bo', 'Cid', 'Dee', 'Eli'];

/**
 * Word, Canvas, and Timer all end their round the same way: a "3, 2, 1,
 * point!" beat stands in for an in-app vote before the reveal button shows
 * up. Mafia votes out loud at the table already, so it skips this.
 */
async function pointAtImpostor() {
  await fireEvent.press(screen.getByTestId('accuse-begin'));
  await waitFor(() => expect(screen.getByTestId('show-results')).toBeTruthy(), { timeout: 5000 });
}

/** Flattened backgroundColor of a swatch button. */
function colorOf(node: { props: Record<string, unknown> }): string | undefined {
  const style = node.props.style as
    | Record<string, unknown>
    | Array<Record<string, unknown> | undefined>
    | undefined;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  return flat?.backgroundColor as string | undefined;
}

/** The colour of whichever swatch is currently marked selected. */
function selectedSwatchColor(): string | undefined {
  const selected = screen
    .getAllByRole('button')
    .find((b) => b.props.accessibilityState?.selected === true);
  return selected ? colorOf(selected) : undefined;
}

/** Draws a single continuous stroke on the canvas and releases. */
async function drawOneStroke() {
  const canvas = screen.getByTestId('draw-canvas');
  await fireEvent(canvas, 'responderGrant', touch(10, 10));
  await fireEvent(canvas, 'responderMove', touch(60, 80));
  await fireEvent(canvas, 'responderMove', touch(120, 40));
  await fireEvent(canvas, 'responderRelease', touch(120, 40, false));
}

let touchClock = 1000;

/**
 * PanResponder derives its gesture state from `event.touchHistory`, so a bare
 * nativeEvent is not enough to drive the canvas — this builds the shape
 * `TouchHistoryMath` expects alongside the coordinates the canvas itself reads.
 */
function touch(locationX: number, locationY: number, active = true) {
  const timeStamp = (touchClock += 16);
  const record = {
    touchActive: active,
    startPageX: locationX,
    startPageY: locationY,
    startTimeStamp: timeStamp,
    currentPageX: locationX,
    currentPageY: locationY,
    currentTimeStamp: timeStamp,
    previousPageX: locationX,
    previousPageY: locationY,
    previousTimeStamp: timeStamp,
  };
  return {
    nativeEvent: {
      locationX,
      locationY,
      pageX: locationX,
      pageY: locationY,
      identifier: 1,
      timestamp: timeStamp,
      touches: active ? [{ locationX, locationY, identifier: 1 }] : [],
      changedTouches: [],
    },
    touchHistory: {
      touchBank: [undefined, record],
      numberActiveTouches: active ? 1 : 0,
      indexOfSingleActiveTouch: 1,
      mostRecentTimeStamp: timeStamp,
    },
  };
}


/** Completes the setup form and enters the chosen mode. */
async function startGame(mode: 'word' | 'canvas' | 'timer' | 'mafia', names = DEFAULT_NAMES) {
  await render(<App />);
  await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

  // The roster starts at DEFAULT_PLAYERS (4) rows — add more if this game needs them.
  const addPlayerLabel = translate('en', 'setup.addPlayer');
  while (screen.queryAllByPlaceholderText(/^Player \d+$/).length < names.length) {
    await fireEvent.press(screen.getByText(addPlayerLabel));
  }

  for (const [i, name] of names.entries()) {
    await fireEvent.changeText(screen.getByPlaceholderText(`Player ${i + 1}`), name);
  }

  await fireEvent.press(screen.getByText(translate('en', `mode.${mode}.name`)));
  await fireEvent.press(screen.getByTestId('start-game'));
}

/** Walks the pass-and-play reveal loop, asserting the privacy contract at every stop. */
async function completeRevealLoop(playerCount: number) {
  for (let i = 0; i < playerCount; i++) {
    // Only the shield is mounted before the hold — the secret does not exist yet.
    expect(screen.getByTestId('shield')).toBeTruthy();
    expect(screen.queryByTestId('secret-content')).toBeNull();
    expect(screen.getByTestId('next-player')).toBeDisabled();

    const target = screen.getByTestId('hold-target');
    await fireEvent(target, 'pressIn');
    expect(screen.getByTestId('secret-content')).toBeTruthy();

    // The pass-along button only unlocks after a sustained hold.
    await waitFor(() => expect(screen.getByTestId('next-player')).toBeEnabled());

    await fireEvent(target, 'pressOut');
    // Releasing unmounts the secret outright — it is never merely covered.
    expect(screen.queryByTestId('secret-content')).toBeNull();
    expect(screen.getByTestId('shield')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('next-player'));
  }
}

describe('setup', () => {
  it('renders and switches between all six languages', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    const nativeName = {
      en: 'English',
      bg: 'Български',
      es: 'Español',
      el: 'Ελληνικά',
      de: 'Deutsch',
      ro: 'Română',
    };

    for (const locale of LOCALES) {
      await fireEvent.press(screen.getByText(nativeName[locale]));
      // Headings, mode names, descriptions and buttons all follow the switch.
      expect(screen.getByText(translate(locale, 'app.tagline'))).toBeTruthy();
      expect(screen.getByText(translate(locale, 'setup.language'))).toBeTruthy();
      expect(screen.getByText(translate(locale, 'mode.mafia.name'))).toBeTruthy();
      expect(screen.getByText(translate(locale, 'mode.timer.desc'))).toBeTruthy();
      expect(screen.getByText(translate(locale, 'setup.start'))).toBeTruthy();
    }
  });

  it('keeps the start button locked until every player is named', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    expect(screen.getByTestId('start-game')).toBeDisabled();
    expect(screen.getByText(translate('en', 'setup.nameRequired'))).toBeTruthy();

    for (const [i, name] of DEFAULT_NAMES.entries()) {
      await fireEvent.changeText(screen.getByPlaceholderText(`Player ${i + 1}`), name);
    }

    // Naming everyone isn't enough on its own — no mode is preselected at launch.
    expect(screen.getByTestId('start-game')).toBeDisabled();

    await fireEvent.press(screen.getByText(translate('en', 'mode.word.name')));

    expect(screen.getByTestId('start-game')).toBeEnabled();
    expect(screen.queryByText(translate('en', 'setup.nameRequired'))).toBeNull();
  });

  it('blocks starting mafia below its 5-player minimum', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    for (const [i, name] of DEFAULT_NAMES.entries()) {
      await fireEvent.changeText(screen.getByPlaceholderText(`Player ${i + 1}`), name);
    }
    await fireEvent.press(screen.getByText(translate('en', 'mode.mafia.name')));

    expect(screen.getByTestId('start-game')).toBeDisabled();
    // Shown twice: the roster hint up top, and the warning by the Start button.
    expect(screen.getAllByText(translate('en', 'mafia.setup.minPlayers', { n: 5 })).length).toBe(2);

    await fireEvent.press(screen.getByText(translate('en', 'setup.addPlayer')));
    await fireEvent.changeText(screen.getByPlaceholderText('Player 5'), 'Eli');

    expect(screen.getByTestId('start-game')).toBeEnabled();
    expect(screen.queryByText(translate('en', 'mafia.setup.minPlayers', { n: 5 }))).toBeNull();
  });

  it('leaves every mode deselected at launch', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    for (const mode of ['word', 'canvas', 'timer', 'mafia']) {
      const name = screen.getByText(translate('en', `mode.${mode}.name`));
      const card = name.parent?.parent;
      expect(card?.props.accessibilityState?.selected).toBeFalsy();
    }
    expect(screen.getByTestId('start-game')).toBeDisabled();
  });

  it('caps the roster at fifteen players', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    expect(screen.getAllByPlaceholderText(/Player/)).toHaveLength(4);

    for (let i = 0; i < 13; i++) {
      await fireEvent.press(screen.getByText(translate('en', 'setup.addPlayer')));
    }
    expect(screen.getAllByPlaceholderText(/Player/)).toHaveLength(15);
    expect(screen.getByText(translate('en', 'setup.maxPlayers'))).toBeTruthy();
  });

  it('exposes the mafia role controls only for that mode', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    expect(screen.queryByText(translate('en', 'mafia.setup.title'))).toBeNull();

    await fireEvent.press(screen.getByText(translate('en', 'mode.mafia.name')));
    expect(screen.getByText(translate('en', 'mafia.setup.title'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'mafia.detective'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'mafia.doctor'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'mafia.civilians'))).toBeTruthy();
  });
});

describe('universal reveal loop', () => {
  it('locks the pass-along button until a genuine hold has happened', async () => {
    await startGame('word');

    expect(screen.getByTestId('next-player')).toBeDisabled();

    const target = screen.getByTestId('hold-target');
    // A momentary tap reveals the secret but must not unlock the pass.
    await fireEvent(target, 'pressIn');
    await fireEvent(target, 'pressOut');
    expect(screen.getByTestId('next-player')).toBeDisabled();

    await fireEvent(target, 'pressIn');
    await waitFor(() => expect(screen.getByTestId('next-player')).toBeEnabled());
    await fireEvent(target, 'pressOut');
    expect(screen.getByTestId('next-player')).toBeEnabled();
  });

  it('shows every player a secret and then reaches the play phase', async () => {
    await startGame('word');
    await completeRevealLoop(4);
    expect(screen.getByText(translate('en', 'word.play.title'))).toBeTruthy();
  });
});

describe('word mode', () => {
  it('names the impostor and the secret word on the results screen', async () => {
    await startGame('word');
    await completeRevealLoop(4);

    // Every player takes a turn speaking.
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByText(translate('en', 'word.play.nextSpeaker')));
    }
    expect(screen.getByText(translate('en', 'word.play.roundDone'))).toBeTruthy();

    await pointAtImpostor();
    await fireEvent.press(screen.getByTestId('show-results'));

    expect(screen.getByText(translate('en', 'results.title'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'results.theImpostor'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'results.secretWord'))).toBeTruthy();
    // Exactly one of the four players is named as the impostor.
    const named = DEFAULT_NAMES.filter((n) => screen.queryByText(n) !== null);
    expect(named).toHaveLength(1);
  });
});

describe('blind intuition timer', () => {
  it('never renders a digit while the timer is running', async () => {
    await startGame('timer');
    await completeRevealLoop(4);

    // Start/Stop fire on press-in, like a real button reacting the instant
    // it's pushed rather than once released.
    await fireEvent(screen.getByTestId('timer-start'), 'pressIn');
    expect(screen.getByTestId('timer-running')).toBeTruthy();

    // No rendered text anywhere on the blind screen may contain a digit —
    // no countdown, no elapsed time, no progress number to count against.
    expect(screen.queryAllByText(/\d/)).toHaveLength(0);
    expect(screen.getByText(translate('en', 'timer.play.stop'))).toBeTruthy();
  });

  it('records each time silently, then reveals them all at the end', async () => {
    await startGame('timer');
    await completeRevealLoop(4);

    for (let i = 0; i < 4; i++) {
      await fireEvent(screen.getByTestId('timer-start'), 'pressIn');
      await fireEvent(screen.getByTestId('timer-stop'), 'pressIn');

      // The recorded value is acknowledged but never shown.
      expect(screen.getByText(translate('en', 'timer.play.recorded'))).toBeTruthy();
      await fireEvent.press(screen.getByText(translate('en', 'timer.play.continue')));
    }

    expect(screen.getByText(translate('en', 'timer.play.allDone'))).toBeTruthy();
    await pointAtImpostor();
    await fireEvent.press(screen.getByTestId('show-results'));

    expect(screen.getByText(translate('en', 'results.yourTimes'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'results.target'))).toBeTruthy();
    // All four players appear in the side-by-side comparison. The impostor shows
    // up twice — once in the banner, once in the list — so count occurrences.
    DEFAULT_NAMES.forEach((name) => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
  });
});

describe('digital mafia', () => {
  it('deals a card to every player and reveals all roles', async () => {
    await startGame('mafia', MAFIA_NAMES);
    await completeRevealLoop(MAFIA_NAMES.length);

    expect(screen.getByText(translate('en', 'mafia.table.title'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('show-results'));
    expect(screen.getByText(translate('en', 'results.allRoles'))).toBeTruthy();
    MAFIA_NAMES.forEach((name) => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
  });

  it('keeps the round clock where it is when paused', async () => {
    await startGame('mafia', MAFIA_NAMES);
    await completeRevealLoop(MAFIA_NAMES.length);

    expect(screen.getByTestId('mafia-clock')).toHaveTextContent('3:00');

    await fireEvent.press(screen.getByTestId('mafia-toggle'));
    await waitFor(() => expect(screen.getByTestId('mafia-clock')).not.toHaveTextContent('3:00'), {
      timeout: 2000,
    });

    // Pausing must not re-arm the clock to the full round length.
    const paused = screen.getByTestId('mafia-clock').props.children;
    await fireEvent.press(screen.getByTestId('mafia-toggle'));
    expect(screen.getByTestId('mafia-clock')).toHaveTextContent(String(paused));
    expect(screen.getByTestId('mafia-clock')).not.toHaveTextContent('3:00');

    // Reset does re-arm it.
    await fireEvent.press(screen.getByTestId('mafia-reset'));
    expect(screen.getByTestId('mafia-clock')).toHaveTextContent('3:00');
  });
});

describe('one-stroke canvas', () => {
  it('reaches the drawing phase with a palette for the first player', async () => {
    await startGame('canvas');
    await completeRevealLoop(4);

    expect(screen.getByText(translate('en', 'canvas.play.pickColor'))).toBeTruthy();
    // Turn order is shuffled, so just assert one of the players is prompted.
    const prompted = DEFAULT_NAMES.filter(
      (n) => screen.queryByText(translate('en', 'canvas.play.yourTurn', { name: n })) !== null,
    );
    expect(prompted).toHaveLength(1);
  });

  it('runs two rounds of one stroke each and keeps the chosen colour', async () => {
    await startGame('canvas');
    await completeRevealLoop(4);

    expect(screen.getByText(/Round 1 of 2/)).toBeTruthy();

    // Pick a colour that is not the default, then confirm it survives the pass.
    const swatches = screen.getAllByRole('button').filter((b) => b.props.accessibilityState?.selected !== undefined);
    expect(swatches.length).toBeGreaterThan(1);
    const chosen = swatches[3];
    await fireEvent.press(chosen);
    const chosenColor = colorOf(chosen);

    // Eight turns in total: four players, twice around the table.
    for (let turn = 0; turn < 8; turn++) {
      const expectedRound = turn < 4 ? 1 : 2;
      expect(screen.getByText(new RegExp(`Round ${expectedRound} of 2`))).toBeTruthy();

      // Whoever holds the phone sees the colour the last player left selected.
      expect(selectedSwatchColor()).toBe(chosenColor);

      await drawOneStroke();

      if (turn < 7) {
        await fireEvent.press(screen.getByTestId('canvas-pass'));
      }
    }

    // After the eighth stroke the drawing is done, not passed on again.
    expect(screen.queryByTestId('canvas-pass')).toBeNull();
    expect(screen.getByTestId('accuse-begin')).toBeTruthy();

    await pointAtImpostor();
    await fireEvent.press(screen.getByTestId('show-results'));
    expect(screen.getByText(translate('en', 'canvas.artwork'))).toBeTruthy();
  });
});

describe('new game', () => {
  it('restarts with the same roster', async () => {
    await startGame('word');
    await completeRevealLoop(4);
    await pointAtImpostor();
    await fireEvent.press(screen.getByTestId('show-results'));

    await fireEvent.press(screen.getByText(translate('en', 'results.newGame')));

    // Straight back into the reveal loop, with no re-entry of names.
    expect(screen.getByTestId('shield')).toBeTruthy();
    expect(screen.queryByTestId('secret-content')).toBeNull();
    expect(screen.getByText(translate('en', 'reveal.progress', { current: 1, total: 4 }))).toBeTruthy();
  });
});

describe('how to play', () => {
  it('shows automatically before setup on a fresh install, then never again', async () => {
    await AsyncStorage.removeItem(HOWTO_SEEN_KEY);

    await render(<App />);
    await waitFor(() => expect(screen.getByTestId('howto-done')).toBeTruthy());
    // Setup has not mounted underneath it.
    expect(screen.queryByText(translate('en', 'app.tagline'))).toBeNull();

    await fireEvent.press(screen.getByTestId('howto-done'));
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());
    expect(await AsyncStorage.getItem(HOWTO_SEEN_KEY)).toBeTruthy();
  });

  it('is reachable again from the setup screen at any time', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('how-to-play'));
    await waitFor(() => expect(screen.getByTestId('howto-done')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('howto-done'));
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());
  });
});

describe('skins', () => {
  it('actually re-colours the real setup screen when the active skin changes, not just the shop preview', async () => {
    await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(['neon-nebula']));
    await AsyncStorage.setItem(ACTIVE_SKIN_KEY, 'neon-nebula');

    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    // Neon Nebula's SHELL.button is near-white, nothing like the default's crimson.
    expect(colorOf(screen.getByTestId('how-to-play'))).toBe('#f4f0fb');
  });

  it('renders the Shoreline skin, animated beach banner included, without crashing', async () => {
    await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(['shoreline']));
    await AsyncStorage.setItem(ACTIVE_SKIN_KEY, 'shoreline');

    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    // Shoreline's SHELL.button is a deep burnt orange — proves the real
    // screen picked up the skin, not just that the app happened not to crash.
    expect(colorOf(screen.getByTestId('how-to-play'))).toBe('#d62700');
  });

  it('opens the catalogue from setup, showing the default skin owned and active', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await waitFor(() => expect(screen.getByTestId('skins-done')).toBeTruthy());
    expect(screen.getByText(translate('en', 'skins.active'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('skins-done'));
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());
  });

  it('opens the privacy policy from setup and returns to setup on done', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('privacy-link'));
    await waitFor(() => expect(screen.getByTestId('privacy-done')).toBeTruthy());
    expect(screen.getByText(translate('en', 'privacy.title'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('privacy-done'));
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());
  });

  it('lists a locked paid skin with its price, not selectable yet', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await waitFor(() => expect(screen.getByText(translate('en', 'skin.neonNebula.name'))).toBeTruthy());
    expect(screen.getByText('€1.00')).toBeTruthy();
    expect(screen.queryByTestId('skin-neon-nebula')).toBeNull();
  });

  it('opens a full preview of a locked skin instead of buying it blind', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await waitFor(() => expect(screen.getByTestId('skin-preview-neon-nebula')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('skin-preview-neon-nebula'));
    await waitFor(() => expect(screen.getByText(translate('en', 'skin.neonNebula.name'))).toBeTruthy());
    // The whole home page mocked up in the new colours, not just the title.
    expect(screen.getAllByText(translate('en', 'app.title')).length).toBeGreaterThan(0);
    expect(screen.getByText(translate('en', 'mode.word.name'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'setup.start'))).toBeTruthy();
    expect(screen.getByTestId('skin-preview-buy')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('skin-preview-back'));
    await waitFor(() => expect(screen.getByTestId('skins-done')).toBeTruthy());
  });

  it('buying a locked skin unlocks and persists it', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await fireEvent.press(screen.getByTestId('skin-preview-neon-nebula'));
    await waitFor(() => expect(screen.getByTestId('skin-preview-buy')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('skin-preview-buy'));
    await waitFor(() => expect(screen.getByTestId('skin-preview-select')).toBeTruthy());
    expect(screen.getByText(translate('en', 'skins.select'))).toBeTruthy();

    const stored = await AsyncStorage.getItem(OWNED_SKINS_KEY);
    expect(JSON.parse(stored ?? '[]')).toContain('neon-nebula');
  });

  it('a failed purchase leaves the skin locked', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { __iapMock } = require('expo-iap');
    __iapMock.nextOutcome = 'error';

    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await fireEvent.press(screen.getByTestId('skin-preview-neon-nebula'));
    await waitFor(() => expect(screen.getByTestId('skin-preview-buy')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('skin-preview-buy'));
    await waitFor(() => expect(screen.getByTestId('skin-preview-buy')).toBeTruthy());
    expect(screen.queryByTestId('skin-preview-select')).toBeNull();

    const stored = await AsyncStorage.getItem(OWNED_SKINS_KEY);
    expect(JSON.parse(stored ?? '[]')).not.toContain('neon-nebula');
  });

  it('syncs a skin already bought elsewhere as soon as billing connects, with no tap needed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { __iapMock } = require('expo-iap');
    __iapMock.restorablePurchases = [
      {
        id: 'restored-2',
        productId: 'skin_shoreline',
        purchaseToken: 'restored-token-2',
        isAutoRenewing: false,
        purchaseState: 'purchased',
        quantity: 1,
        store: 'play',
        transactionDate: Date.now(),
      },
    ];

    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    // Never touches skins-restore — this is the automatic, connect-time sync.
    await waitFor(() => expect(screen.getByTestId('skin-shoreline')).toBeTruthy());
    expect(screen.queryByTestId('skin-preview-shoreline')).toBeNull();
  });

  it('restoring purchases unlocks a skin already bought elsewhere', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { __iapMock } = require('expo-iap');
    __iapMock.restorablePurchases = [
      {
        id: 'restored-1',
        productId: 'skin_neon_nebula',
        purchaseToken: 'restored-token-1',
        isAutoRenewing: false,
        purchaseState: 'purchased',
        quantity: 1,
        store: 'play',
        transactionDate: Date.now(),
      },
    ];

    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await waitFor(() => expect(screen.getByTestId('skins-restore')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('skins-restore'));

    await waitFor(() => expect(screen.getByTestId('skin-neon-nebula')).toBeTruthy());
    expect(screen.queryByTestId('skin-preview-neon-nebula')).toBeNull();
  });

  it('applies an owned skin on tap and re-colours the shop list itself immediately', async () => {
    await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(['neon-nebula']));

    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await waitFor(() => expect(screen.getByTestId('skin-neon-nebula')).toBeTruthy());

    // No separate preview window for an owned skin — tapping the whole card
    // applies it directly.
    await fireEvent.press(screen.getByTestId('skin-neon-nebula'));
    await waitFor(() =>
      expect(screen.getByTestId('skin-neon-nebula').props.accessibilityState.selected).toBe(true),
    );

    // Neon Nebula's ink (#1b1230) is nothing like DMG Classic's (#233b16) —
    // proves the shop list re-themed live, right here, not just the console
    // chrome around it or the real setup screen after leaving.
    expect(colorOf(screen.getByTestId('skin-neon-nebula'))).toBe('#1b1230');
  });
});
