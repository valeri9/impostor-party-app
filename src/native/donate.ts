import { Linking } from 'react-native';

/**
 * TODO(valeri): swap this for the real revolut.me link before shipping —
 * this placeholder does not go anywhere.
 */
const DONATE_URL = 'https://revolut.me/REPLACE_ME';

/** Failure-tolerant like haptics/sound — a broken link should never crash the app. */
export function openDonateLink() {
  Linking.openURL(DONATE_URL).catch(() => {});
}
