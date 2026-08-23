import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIAP, type Purchase } from 'expo-iap';

export type SkinPurchases = {
  /** True once Play Billing is connected and ready to sell. */
  ready: boolean;
  /** Localized store price per product id, filled in once fetched — until
   *  then (or if the store never connects), the caller falls back to its own
   *  display price. */
  pricesByProductId: Record<string, string>;
  /** The product id currently mid-purchase, or null. */
  purchasingId: string | null;
  isRestoring: boolean;
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
};

function purchaseKey(purchase: Purchase): string {
  return purchase.purchaseToken ?? purchase.id;
}

/**
 * Bridges expo-iap's hook-shaped API into the small surface the Skins screen
 * actually needs. `onUnlock` is called for both a fresh successful purchase
 * and anything found already owned on restore — Google Play is the source of
 * truth for ownership, this just mirrors it into local storage via the
 * caller's existing `unlockSkin`.
 *
 * A non-consumable purchase Google hasn't received `finishTransaction` for
 * within 3 days gets auto-refunded, so both paths below call it unconditionally,
 * including for purchases restored from a connection that started after the
 * app was killed mid-purchase.
 *
 * Ownership also syncs the moment billing connects, not just on an explicit
 * Restore Purchases tap — Google Play ties a purchase to the signed-in
 * account, not the device, so a skin bought on one phone should just show up
 * owned on the next one without the player needing to know a restore button
 * exists.
 */
export function useSkinPurchases(productIds: string[], onUnlock: (productId: string) => void): SkinPurchases {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  const { connected, products, fetchProducts, requestPurchase, finishTransaction, restorePurchases, availablePurchases } =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        setPurchasingId(null);
        if (purchase.productId) onUnlockRef.current(purchase.productId);
        finishTransaction({ purchase, isConsumable: false }).catch(() => {});
      },
      onPurchaseError: () => {
        setPurchasingId(null);
      },
    });

  const skus = useMemo(() => productIds, [productIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!connected || skus.length === 0) return;
    fetchProducts({ skus, type: 'in-app' }).catch(() => {});
  }, [connected, skus, fetchProducts]);

  // Silent background sync — deliberately not routed through `restore()`
  // below, so it never flips `isRestoring` or looks like the player did
  // anything. Runs once per connection.
  const autoRestoredRef = useRef(false);
  useEffect(() => {
    if (!connected || autoRestoredRef.current) return;
    autoRestoredRef.current = true;
    restorePurchases().catch(() => {});
  }, [connected, restorePurchases]);

  const pricesByProductId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of products) {
      if (p.id && p.displayPrice) map[p.id] = p.displayPrice;
    }
    return map;
  }, [products]);

  const purchase = useCallback(
    async (productId: string) => {
      setPurchasingId(productId);
      try {
        await requestPurchase({ request: { google: { skus: [productId] } }, type: 'in-app' });
      } catch {
        setPurchasingId(null);
      }
    },
    [requestPurchase],
  );

  const restore = useCallback(async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
    } catch {
      // Best-effort — Restore Purchases has no failure state of its own to show.
    } finally {
      setIsRestoring(false);
    }
  }, [restorePurchases]);

  // restorePurchases() only populates availablePurchases; it doesn't unlock
  // or finish anything on its own. Sweep it for both an explicit Restore tap
  // and any purchase that was already owned when the store connected (the
  // stranded-purchase case above).
  const processedRef = useRef(new Set<string>());
  useEffect(() => {
    for (const p of availablePurchases) {
      const key = purchaseKey(p);
      if (!key || processedRef.current.has(key)) continue;
      processedRef.current.add(key);
      if (p.productId) onUnlockRef.current(p.productId);
      finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
    }
  }, [availablePurchases, finishTransaction]);

  return { ready: connected, pricesByProductId, purchasingId, isRestoring, purchase, restore };
}
