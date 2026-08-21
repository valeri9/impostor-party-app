/* Native-module stand-ins so screens can be rendered in a plain Node test env. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-GB', regionCode: 'GB' }],
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ play: jest.fn(), seekTo: jest.fn(), remove: jest.fn() }),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: () => {},
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

// The real provider withholds children until it measures native insets, which
// never happens in a test env — pass children straight through with zero insets.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// The storage mock is module-level state: a language chosen in one test would
// otherwise leak into the next one and render it in the wrong locale.
beforeEach(() => {
  const storage = require('@react-native-async-storage/async-storage');
  const mock = storage.default ?? storage;
  const { HOWTO_SEEN_KEY } = require('./src/native/storageKeys');
  // Tests exercise gameplay, not first-launch onboarding, so the how-to-play
  // screen starts pre-dismissed. The onboarding suite clears this key itself.
  mock.__INTERNAL_MOCK_STORAGE__ = { [HOWTO_SEEN_KEY]: '1' };
});
