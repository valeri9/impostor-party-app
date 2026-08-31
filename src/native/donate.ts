import { Linking } from 'react-native';

const DONATE_URL = 'https://revolut.me/valeri_dimitrov';

/** Failure-tolerant like haptics/sound — a broken link should never crash the app. */
export function openDonateLink() {
  Linking.openURL(DONATE_URL).catch(() => {});
}
