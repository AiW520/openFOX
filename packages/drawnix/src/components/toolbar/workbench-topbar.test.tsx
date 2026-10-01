// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchTopbar } from './workbench-topbar';
import {
  SETTINGS_PROVIDER_NAV_EVENT,
  type ProviderNavigationIntent,
} from '../settings-dialog/provider-settings-navigation';

const { setAppState } = vi.hoisted(() => ({ setAppState: vi.fn() }));
vi.mock('../../hooks/use-drawnix', () => ({
  DialogType: { aiImageGeneration: 'ai-image-generation' },
  useDrawnix: () => ({ board: null, setAppState, openDialog: vi.fn() }),
}));
vi.mock('../../i18n', () => ({ useI18n: () => ({ language: 'zh' }) }));
vi.mock('./site-share', () => ({ SiteShare: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Reflect.deleteProperty(window, '__aituPendingProviderNavigationIntent');
});

describe('new workbench settings entry', () => {
  it('requests the Tuzi account on every activation, before opening settings', () => {
    const received: ProviderNavigationIntent[] = [];
    const listener = (event: Event) => {
      received.push((event as CustomEvent<ProviderNavigationIntent>).detail);
    };
    window.addEventListener(SETTINGS_PROVIDER_NAV_EVENT, listener);
    try {
      render(<WorkbenchTopbar taskButtonRef={() => undefined} batchAvailable />);
      for (let index = 0; index < 2; index++) {
        fireEvent.click(screen.getByRole('button', { name: '配置' }));
        expect(received[index]).toEqual({ action: 'tuzi-account' });
        expect(
          (window as typeof window & {
            __aituPendingProviderNavigationIntent?: ProviderNavigationIntent;
          }).__aituPendingProviderNavigationIntent
        ).toEqual({ action: 'tuzi-account' });
        const update = setAppState.mock.calls[index][0];
        expect(update({ openSettings: index === 1, other: 'preserved' })).toEqual({
          openSettings: true,
          other: 'preserved',
        });
      }
    } finally {
      window.removeEventListener(SETTINGS_PROVIDER_NAV_EVENT, listener);
    }
  });
});
