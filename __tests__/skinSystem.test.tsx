import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ACTIVE_SKIN_KEY, OWNED_SKINS_KEY } from '../src/native/storageKeys';
import { SkinProvider, useSkin } from '../src/theme/SkinContext';
import { DEFAULT_SKIN_ID, SKINS, type Skin } from '../src/theme/skins';

// A throwaway paid entry, pushed into the real registry just for these tests
// so the ownership-gating logic gets exercised without deciding what any
// real future skin actually looks like.
const PAID_SKIN: Skin = {
  id: 'test-paid-skin',
  nameKey: 'skin.testPaid.name',
  taglineKey: 'skin.testPaid.tagline',
  priceCents: 199,
  lcd: SKINS[0].lcd,
  shell: SKINS[0].shell,
};

beforeAll(() => {
  SKINS.push(PAID_SKIN);
});

afterAll(() => {
  const idx = SKINS.findIndex((s) => s.id === PAID_SKIN.id);
  if (idx !== -1) SKINS.splice(idx, 1);
});

function Harness() {
  const { ready, activeSkin, isOwned, setActiveSkin, unlockSkin } = useSkin();
  if (!ready) return <Text testID="active">loading</Text>;
  return (
    <>
      <Text testID="active">{activeSkin.id}</Text>
      <Text testID="owned-paid">{String(isOwned(PAID_SKIN.id))}</Text>
      <Pressable testID="switch-to-paid" onPress={() => setActiveSkin(PAID_SKIN.id)}>
        <Text>switch</Text>
      </Pressable>
      <Pressable testID="unlock-paid" onPress={() => unlockSkin(PAID_SKIN.id)}>
        <Text>unlock</Text>
      </Pressable>
    </>
  );
}

function renderHarness() {
  render(
    <SkinProvider>
      <Harness />
    </SkinProvider>,
  );
}

describe('skin system', () => {
  it('defaults to the free skin, already owned from install', async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('active').props.children).toBe(DEFAULT_SKIN_ID));
    expect(screen.getByTestId('owned-paid').props.children).toBe('false');
  });

  it('refuses to switch to a skin that has not been unlocked', async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('active').props.children).toBe(DEFAULT_SKIN_ID));
    await fireEvent.press(screen.getByTestId('switch-to-paid'));
    expect(screen.getByTestId('active').props.children).toBe(DEFAULT_SKIN_ID);
  });

  it('unlocking a skin makes it selectable, and the choice persists', async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('active').props.children).toBe(DEFAULT_SKIN_ID));

    await fireEvent.press(screen.getByTestId('unlock-paid'));
    await waitFor(() => expect(screen.getByTestId('owned-paid').props.children).toBe('true'));

    await fireEvent.press(screen.getByTestId('switch-to-paid'));
    expect(screen.getByTestId('active').props.children).toBe(PAID_SKIN.id);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(OWNED_SKINS_KEY)).toContain(PAID_SKIN.id);
      expect(await AsyncStorage.getItem(ACTIVE_SKIN_KEY)).toBe(PAID_SKIN.id);
    });
  });

  it('reloads a previously unlocked and selected skin on next launch', async () => {
    await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify([PAID_SKIN.id]));
    await AsyncStorage.setItem(ACTIVE_SKIN_KEY, PAID_SKIN.id);

    renderHarness();
    await waitFor(() => expect(screen.getByTestId('active').props.children).toBe(PAID_SKIN.id));
    expect(screen.getByTestId('owned-paid').props.children).toBe('true');
  });

  it('ignores an unknown skin id from storage and falls back to the default', async () => {
    await AsyncStorage.setItem(ACTIVE_SKIN_KEY, 'not-a-real-skin');

    renderHarness();
    await waitFor(() => expect(screen.getByTestId('active').props.children).toBe(DEFAULT_SKIN_ID));
  });
});
