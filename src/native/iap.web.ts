import { useMemo } from 'react';

import type { SkinPurchases } from './iap';

/**
 * Play Billing doesn't exist on web — Metro resolves this file in place of
 * iap.ts for any web build, so expo-iap (a native-only module) is never even
 * imported there. Locked skins simply stay unpurchasable on web; the Skins
 * screen falls back to its own display price and hides purchase actions
 * behind `ready: false`.
 */
export function useSkinPurchases(_productIds: string[], _onUnlock: (productId: string) => void): SkinPurchases {
  return useMemo(
    () => ({
      ready: false,
      pricesByProductId: {},
      purchasingId: null,
      isRestoring: false,
      purchase: async () => {},
      restore: async () => {},
    }),
    [],
  );
}
