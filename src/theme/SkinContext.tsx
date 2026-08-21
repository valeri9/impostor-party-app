import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ACTIVE_SKIN_KEY, OWNED_SKINS_KEY } from '../native/storageKeys';
import { deriveColors } from './tokens';
import { DEFAULT_SKIN_ID, findSkin, isFree, SKINS, type Skin } from './skins';

type SkinValue = {
  /** False until the stored active/owned skins have been read once. */
  ready: boolean;
  skins: Skin[];
  activeSkin: Skin;
  ownedSkinIds: string[];
  isOwned: (id: string) => boolean;
  /** No-ops if the skin isn't owned yet — buy it first. */
  setActiveSkin: (id: string) => void;
  /** Marks a skin as owned. Stands in for "purchase succeeded" until
   *  in-app billing is wired up — the shop screen will call this once a
   *  payment actually clears. */
  unlockSkin: (id: string) => void;
};

const SkinContext = createContext<SkinValue | null>(null);

/** Every skin, so local dev builds always have the full catalogue to try
 *  without a purchase flow. Gated on __DEV__ (never ships — a production
 *  build falls back to just the free default) *and* excludes NODE_ENV ===
 *  'test': __DEV__ is also true under Jest, and the ownership-gating tests
 *  need paid skins to actually start locked. */
function baseOwnedIds(): string[] {
  const devUnlockAll = __DEV__ && process.env.NODE_ENV !== 'test';
  return devUnlockAll ? SKINS.map((s) => s.id) : [DEFAULT_SKIN_ID];
}

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [activeSkinId, setActiveSkinId] = useState(DEFAULT_SKIN_ID);
  // The free skin is always owned, even before storage has loaded.
  const [ownedSkinIds, setOwnedSkinIds] = useState<string[]>(baseOwnedIds);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let storedActive: string | null = null;
      let storedOwned: string | null = null;
      try {
        [storedActive, storedOwned] = await Promise.all([
          AsyncStorage.getItem(ACTIVE_SKIN_KEY),
          AsyncStorage.getItem(OWNED_SKINS_KEY),
        ]);
      } catch {
        // Storage is best-effort; fall back to the free default skin.
      }
      if (cancelled) return;

      let owned: string[] = baseOwnedIds();
      if (storedOwned) {
        try {
          const parsed = JSON.parse(storedOwned);
          if (Array.isArray(parsed)) owned = Array.from(new Set([...baseOwnedIds(), ...parsed]));
        } catch {
          // Corrupt entry — fall back to the base set.
        }
      }
      setOwnedSkinIds(owned);

      const storedSkin = storedActive ? SKINS.find((s) => s.id === storedActive) : undefined;
      if (storedSkin && (isFree(storedSkin) || owned.includes(storedSkin.id))) {
        setActiveSkinId(storedSkin.id);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveSkin = useCallback(
    (id: string) => {
      const skin = SKINS.find((s) => s.id === id);
      if (!skin) return;
      if (!isFree(skin) && !ownedSkinIds.includes(id)) return;
      setActiveSkinId(id);
      AsyncStorage.setItem(ACTIVE_SKIN_KEY, id).catch(() => {});
    },
    [ownedSkinIds],
  );

  const unlockSkin = useCallback((id: string) => {
    if (!SKINS.some((s) => s.id === id)) return;
    setOwnedSkinIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isOwned = useCallback(
    (id: string) => {
      const skin = SKINS.find((s) => s.id === id);
      if (!skin) return false;
      return isFree(skin) || ownedSkinIds.includes(id);
    },
    [ownedSkinIds],
  );

  const value = useMemo<SkinValue>(
    () => ({
      ready,
      skins: SKINS,
      activeSkin: findSkin(activeSkinId),
      ownedSkinIds,
      isOwned,
      setActiveSkin,
      unlockSkin,
    }),
    [ready, activeSkinId, ownedSkinIds, isOwned, setActiveSkin, unlockSkin],
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinValue {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error('useSkin must be used inside <SkinProvider>');
  return ctx;
}

/** The active skin's palette, resolved into the same shape tokens.ts's
 *  static LCD/SHELL/colors exports use — for screens once they migrate off
 *  the static default and start rendering whichever skin is active. */
export function useSkinTokens() {
  const { activeSkin } = useSkin();
  return useMemo(
    () => ({
      LCD: activeSkin.lcd,
      SHELL: activeSkin.shell,
      colors: deriveColors(activeSkin.lcd),
    }),
    [activeSkin],
  );
}
