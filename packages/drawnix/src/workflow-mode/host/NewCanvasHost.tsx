import { Component, Suspense, lazy, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeft, Layers, ListTodo, SlidersHorizontal } from 'lucide-react';
import { useCanvasStore, flushCanvasStorage } from '../web/src/stores/canvas/use-canvas-store';
import { navigateWorkflow, subscribeWorkflowNavigation, getWorkflowNavigationSnapshot, isWorkflowPath } from './workflow-navigation';
import { WorkflowTasks } from '../web/src/components/layout/workflow-tasks';
import './new-canvas-host.scss';
import { useCompactScreen } from '../../hooks/use-compact-screen';

const WorkflowApp = lazy(() => import('../web/src/WorkflowApp').then(module => ({ default: module.WorkflowApp })));
const PROJECT_MAP_KEY = 'opentu:workflow:board-projects';

function readProjectMapping(): Record<string, string> {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(PROJECT_MAP_KEY) || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0));
        }
    } catch { /* Keep project documents intact if the index is unavailable. */ }
    return {};
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <div className="new-canvas-host__status" role="alert">画布加载失败，请刷新重试。</div> : this.props.children; }
}

export function NewCanvasHost({ boardId, onHome, onLegacy, onProviderSettings }: {
    boardId: string | null;
    onHome: () => void;
    onLegacy: () => void;
    onProviderSettings: (profileId?: string | null) => void;
}) {
    const compactScreen = useCompactScreen();
    const hydrated = useCanvasStore(state => state.hydrated);
    const [ready, setReady] = useState(false);
    const [tasksOpen, setTasksOpen] = useState(false);
    const { href } = useSyncExternalStore(subscribeWorkflowNavigation, getWorkflowNavigationSnapshot);
    const pathname = new URL(href).pathname;

    useEffect(() => {
        if (!hydrated) return;
        const state = useCanvasStore.getState();
        const routeId = window.location.pathname.match(/^\/workflow\/canvas\/([^/]+)$/)?.[1];
        const urlBoardId = new URLSearchParams(window.location.search).get('board');
        const stableBoardId = boardId || urlBoardId;
        const key = stableBoardId || 'default';
        const mapping = readProjectMapping();
        let id = routeId && state.openProject(routeId) ? routeId : mapping[key];
        if (!id || !state.openProject(id)) id = state.createProject();
        mapping[key] = id;
        try { localStorage.setItem(PROJECT_MAP_KEY, JSON.stringify(mapping)); }
        catch (error) { console.warn('[Workflow] Could not save project index', error); }
        if (!isWorkflowPath() || window.location.pathname === '/workflow' || window.location.pathname === '/workflow/') {
            navigateWorkflow(`/workflow/canvas/${id}`, true);
        }
        void flushCanvasStorage().catch(error => console.error('[Workflow] Could not save project', error));
        setReady(true);
    }, [boardId, hydrated]);


    const currentProjectId = pathname.match(/^\/workflow\/canvas\/([^/]+)$/)?.[1];
    return <section className={`new-canvas-host${compactScreen ? ' new-canvas-host--compact' : ''}`} aria-label="无限画布">
        <header className="new-canvas-host__header" data-testid="workbench-topbar">
            <button type="button" className="new-canvas-host__brand" onClick={onHome} title="返回工作台首页"><ArrowLeft size={15} /><span>OpenTu</span></button>
            <div className="new-canvas-host__version" role="group" aria-label="切换画布">
                <button type="button" aria-pressed="false" onClick={onLegacy}>自由画布</button>
                <button type="button" aria-pressed="true">工作流画布</button>
            </div>
            <nav aria-label="画布快捷操作">
                <button type="button" data-testid="workbench-config" onClick={() => { window.dispatchEvent(new CustomEvent('opentu:workflow:close-overlays')); onProviderSettings(); }}><SlidersHorizontal size={16} /><span>配置</span></button>
                <button type="button" data-testid="workbench-batch" onClick={() => { window.dispatchEvent(new CustomEvent('opentu:workflow:close-overlays')); navigateWorkflow('/workflow/batch-generation'); }}><Layers size={16} /><span>批量生图</span></button>
                <button type="button" data-testid="workbench-tasks" onClick={() => { window.dispatchEvent(new CustomEvent('opentu:workflow:close-overlays')); setTasksOpen(value => !value); }} aria-pressed={tasksOpen}><ListTodo size={16} /><span>任务</span></button>
            </nav>
            {!currentProjectId && <button type="button" className="new-canvas-host__return" onClick={() => {
                const mapping = readProjectMapping();
                const id = mapping[boardId || 'default'];
                navigateWorkflow(id ? `/workflow/canvas/${id}` : '/workflow/canvas');
            }}>返回画布</button>}
        </header>
        {!hydrated && <div className="new-canvas-host__status" role="status">正在恢复画布数据...</div>}
        {hydrated && !ready && <div className="new-canvas-host__status" role="status">正在准备画布...</div>}
        {ready && <CanvasErrorBoundary><Suspense fallback={<div className="new-canvas-host__status" role="status">正在加载画布...</div>}>
            <WorkflowApp onOpenProviderSettings={onProviderSettings} />
        </Suspense></CanvasErrorBoundary>}
        {tasksOpen && <WorkflowTasks projectId={currentProjectId} onClose={() => setTasksOpen(false)} />}
    </section>;
}
