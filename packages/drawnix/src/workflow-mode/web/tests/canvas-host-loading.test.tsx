import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewCanvasHost } from '../../host/NewCanvasHost';

const fixture = vi.hoisted(() => ({
    hydrated: false,
    openProject: vi.fn(),
    createProject: vi.fn(() => 'new-project'),
    flush: vi.fn(async () => {}),
}));
vi.mock('../src/stores/canvas/use-canvas-store', () => ({
    useCanvasStore: Object.assign((select: (state: typeof fixture) => unknown) => select(fixture), { getState: () => fixture }),
    flushCanvasStorage: fixture.flush,
}));
vi.mock('../src/WorkflowApp', () => ({ WorkflowApp: () => <div>Ready canvas</div> }));
vi.mock('../src/components/layout/workflow-tasks', () => ({ WorkflowTasks: () => null }));

beforeEach(() => {
    fixture.hydrated = false;
    fixture.openProject.mockReset();
    fixture.createProject.mockClear();
    fixture.flush.mockClear();
    localStorage.clear();
    window.history.replaceState(null, '', '/?board=board-a&experience=new');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const mount = () => render(<NewCanvasHost boardId="board-a" onHome={vi.fn()} onLegacy={vi.fn()} onProviderSettings={vi.fn()} />);

describe('canvas startup recovery', () => {
    it('shows hydration status before opening any projects', () => {
        mount();
        expect(screen.getByRole('status').textContent).toContain('正在恢复画布数据');
        expect(fixture.createProject).not.toHaveBeenCalled();
    });
    it('opens a mapped existing project without creating another one', async () => {
        fixture.hydrated = true;
        fixture.openProject.mockReturnValue({ id: 'existing-project' });
        localStorage.setItem('opentu:workflow:board-projects', JSON.stringify({ 'board-a': 'existing-project' }));
        mount();
        expect(await screen.findByText('Ready canvas')).toBeTruthy();
        expect(window.location.pathname).toBe('/workflow/canvas/existing-project');
        expect(fixture.createProject).not.toHaveBeenCalled();
    });
    it.each(['broken-json', '[]', '{"board-a":42}'])('recovers an invalid index: %s', async (index) => {
        fixture.hydrated = true;
        localStorage.setItem('opentu:workflow:board-projects', index);
        localStorage.setItem('existing-document', 'keep');
        mount();
        expect(await screen.findByText('Ready canvas')).toBeTruthy();
        expect(fixture.createProject).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('existing-document')).toBe('keep');
        expect(window.location.pathname).toBe('/workflow/canvas/new-project');
    });
    it('continues rendering when the index cannot be written', async () => {
        fixture.hydrated = true;
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); });
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        mount();
        expect(await screen.findByText('Ready canvas')).toBeTruthy();
        expect(fixture.flush).toHaveBeenCalled();
    });
});
