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

// Real expo-iap requires a native store connection this test env doesn't
// have. `__iapMock.nextOutcome` lets a test pick what the next requestPurchase
// call does ('success' | 'cancel' | 'error') before pressing a Buy button.
jest.mock('expo-iap', () => {
  const React = require('react');
  const __iapMock = { nextOutcome: 'success', restorablePurchases: [] };
  return {
    __iapMock,
    useIAP: (options) => {
      const optionsRef = React.useRef(options);
      optionsRef.current = options;
      const [availablePurchases, setAvailablePurchases] = React.useState([]);
      return {
        connected: true,
        products: [],
        availablePurchases,
        fetchProducts: jest.fn(() => Promise.resolve()),
        finishTransaction: jest.fn(() => Promise.resolve()),
        restorePurchases: jest.fn(() => {
          setAvailablePurchases(__iapMock.restorablePurchases);
          return Promise.resolve();
        }),
        requestPurchase: jest.fn(async ({ request }) => {
          const sku = request?.google?.skus?.[0];
          if (__iapMock.nextOutcome === 'success' && sku) {
            const purchase = {
              id: `mock-${sku}`,
              productId: sku,
              purchaseToken: `mock-token-${sku}`,
              isAutoRenewing: false,
              purchaseState: 'purchased',
              quantity: 1,
              store: 'play',
              transactionDate: Date.now(),
            };
            optionsRef.current?.onPurchaseSuccess?.(purchase);
            return purchase;
          }
          const error = {
            code: __iapMock.nextOutcome === 'cancel' ? 'E_USER_CANCELLED' : 'E_UNKNOWN',
            message: 'mock purchase error',
          };
          optionsRef.current?.onPurchaseError?.(error);
          throw error;
        }),
      };
    },
  };
});

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

  const iapMock = require('expo-iap').__iapMock;
  iapMock.nextOutcome = 'success';
  iapMock.restorablePurchases = [];
});
