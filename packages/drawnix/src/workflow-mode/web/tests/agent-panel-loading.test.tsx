import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentPanel } from '../src/components/agent/agent-panel';
import { useAgentStore } from '../src/stores/use-agent-store';

vi.mock('../src/components/agent/local-agent-panel', () => ({ LocalAgentPanel: () => <div>Agent session</div> }));
beforeEach(() => useAgentStore.setState({ panelOpen: false, panelMounted: true, enabled: false, fragmentBootstrap: false, panelClosing: false }));
afterEach(cleanup);
const mount = (path = '/') => render(<MemoryRouter initialEntries={[path]}><AgentPanel /></MemoryRouter>);

describe('deferred assistant session', () => {
    it('waits until requested and retains the session when closed', async () => {
        mount();
        expect(screen.queryByText('Agent session')).toBeNull();
        act(() => useAgentStore.getState().openPanel());
        expect(await screen.findByText('Agent session')).toBeTruthy();
        act(() => useAgentStore.setState({ panelOpen: false }));
        expect(screen.getByText('Agent session')).toBeTruthy();
    });
    it('loads for an enabled connection even when the panel is hidden', async () => {
        mount();
        act(() => useAgentStore.setState({ enabled: true }));
        expect(await screen.findByText('Agent session')).toBeTruthy();
    });
    it.each(['/?agentUrl=http%3A%2F%2Flocalhost&agentToken=fixture', '/#agentUrl=http%3A%2F%2Flocalhost&agentToken=fixture'])('preserves URL bootstrap: %s', async path => {
        mount(path);
        expect(await screen.findByText('Agent session')).toBeTruthy();
    });
});
