import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from '../App';
import { LOCALES, translate } from '../src/i18n';
import { HOWTO_SEEN_KEY } from '../src/native/storageKeys';

const DEFAULT_NAMES = ['Ana', 'Bo', 'Cid', 'Dee'];

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

    expect(screen.getByTestId('start-game')).toBeEnabled();
    expect(screen.queryByText(translate('en', 'setup.nameRequired'))).toBeNull();
  });

  it('caps the roster at ten players', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    expect(screen.getAllByPlaceholderText(/Player/)).toHaveLength(4);

    for (let i = 0; i < 8; i++) {
      await fireEvent.press(screen.getByText(translate('en', 'setup.addPlayer')));
    }
    expect(screen.getAllByPlaceholderText(/Player/)).toHaveLength(10);
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

    await fireEvent.press(screen.getByTestId('timer-start'));
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
      await fireEvent.press(screen.getByTestId('timer-start'));
      await fireEvent.press(screen.getByTestId('timer-stop'));

      // The recorded value is acknowledged but never shown.
      expect(screen.getByText(translate('en', 'timer.play.recorded'))).toBeTruthy();
      await fireEvent.press(screen.getByText(translate('en', 'timer.play.continue')));
    }

    expect(screen.getByText(translate('en', 'timer.play.allDone'))).toBeTruthy();
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
    await startGame('mafia');
    await completeRevealLoop(4);

    expect(screen.getByText(translate('en', 'mafia.table.title'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('show-results'));
    expect(screen.getByText(translate('en', 'results.allRoles'))).toBeTruthy();
    DEFAULT_NAMES.forEach((name) => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
  });

  it('keeps the round clock where it is when paused', async () => {
    await startGame('mafia');
    await completeRevealLoop(4);

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
    expect(screen.getByTestId('show-results')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('show-results'));
    expect(screen.getByText(translate('en', 'canvas.artwork'))).toBeTruthy();
  });
});

describe('new game', () => {
  it('restarts with the same roster', async () => {
    await startGame('word');
    await completeRevealLoop(4);
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
  it('opens the catalogue from setup, showing the default skin owned and active', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await waitFor(() => expect(screen.getByTestId('skins-done')).toBeTruthy());
    expect(screen.getByText(translate('en', 'skins.active'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('skins-done'));
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());
  });

  it('lists a locked paid skin with its price, not selectable yet', async () => {
    await render(<App />);
    await waitFor(() => expect(screen.getByText(translate('en', 'app.tagline'))).toBeTruthy());

    await fireEvent.press(screen.getByTestId('open-skins'));
    await waitFor(() => expect(screen.getByText(translate('en', 'skin.neonNebula.name'))).toBeTruthy());
    expect(screen.getByText('€1.99')).toBeTruthy();
    expect(screen.queryByTestId('skin-neon-nebula')).toBeNull();
  });
});
