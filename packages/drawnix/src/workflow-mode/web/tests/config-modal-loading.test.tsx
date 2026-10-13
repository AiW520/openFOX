import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTopNav } from '../src/components/layout/app-top-nav';

const state = vi.hoisted(() => ({ open: false }));
vi.mock('../src/stores/use-config-store', () => ({ useConfigStore: (selector: (value: unknown) => unknown) => selector({ isConfigOpen: state.open }) }));
vi.mock('../src/stores/use-agent-store', () => ({ useAgentStore: (selector: (value: unknown) => unknown) => selector({ token: '', enabled: false, connected: false }) }));
vi.mock('../src/components/layout/app-config-modal', () => ({ AppConfigModal: () => <div>Configuration session</div> }));
vi.mock('../src/components/layout/mobile-nav-drawer', () => ({ MobileNavDrawer: () => null }));
vi.mock('../src/components/layout/user-status-actions', () => ({ UserStatusActions: () => null }));
beforeEach(() => { state.open = false; });
afterEach(cleanup);
const layout = () => <MemoryRouter><AppTopNav /></MemoryRouter>;

describe('deferred configuration', () => {
    it('waits for opening and keeps the modal state after closing', async () => {
        const view = render(layout());
        expect(screen.queryByText('Configuration session')).toBeNull();
        act(() => { state.open = true; view.rerender(layout()); });
        expect(await screen.findByText('Configuration session')).toBeTruthy();
        act(() => { state.open = false; view.rerender(layout()); });
        expect(screen.getByText('Configuration session')).toBeTruthy();
    });
    it('supports a configuration dialog already requested on mount', async () => {
        state.open = true;
        render(layout());
        expect(await screen.findByText('Configuration session')).toBeTruthy();
    });
});
