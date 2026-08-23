import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { I18nProvider } from '../src/i18n';
import { SkinProvider } from '../src/theme/SkinContext';

function Bomb({ armed }: { armed: boolean }): React.JSX.Element {
  if (armed) throw new Error('boom');
  return <></>;
}

async function renderBoundary(child: React.ReactNode) {
  return render(
    <SkinProvider>
      <I18nProvider>
        <ErrorBoundary>{child}</ErrorBoundary>
      </I18nProvider>
    </SkinProvider>,
  );
}

describe('ErrorBoundary', () => {
  // React logs caught errors to the console by default; keep the test output clean.
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders the fallback instead of crashing when a child throws', async () => {
    await renderBoundary(<Bomb armed />);
    expect(await screen.findByTestId('error-restart')).toBeTruthy();
  });

  it('renders children normally when nothing throws', async () => {
    await renderBoundary(<Bomb armed={false} />);
    expect(screen.queryByTestId('error-restart')).toBeNull();
  });

  it('recovers when Restart is pressed and the underlying issue has cleared', async () => {
    let shouldThrow = true;
    function FlakyChild() {
      if (shouldThrow) throw new Error('boom');
      return <Text testID="recovered">ok</Text>;
    }
    await renderBoundary(<FlakyChild />);

    const restart = await screen.findByTestId('error-restart');
    shouldThrow = false;
    fireEvent.press(restart);

    expect(await screen.findByTestId('recovered')).toBeTruthy();
  });
});
