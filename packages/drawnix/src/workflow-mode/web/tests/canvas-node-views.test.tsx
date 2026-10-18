import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../src/i18n';
import { CanvasNodesTab } from '../src/components/canvas/canvas-side-panel';
import { canvasThemes } from '../src/lib/canvas-theme';
import { useCanvasSidePanelStore } from '../src/stores/use-canvas-side-panel-store';
import { imageLeaseCache } from '../src/services/media-leases';
import { CanvasNodeType, type CanvasNodeData } from '../src/types/canvas';

const mocks = vi.hoisted(() => ({ preview: vi.fn(), original: vi.fn(), exportNodes: vi.fn(), compact: false }));
vi.mock('../src/services/image-storage', () => ({ getImagePreviewBlob: mocks.preview, getImageBlob: mocks.original, subscribeImagePreviews: () => () => {}, getImagePreviewRevision: () => 0 }));
vi.mock('../src/services/file-storage', () => ({ getMediaBlob: vi.fn() }));
vi.mock('../../../../services/memory-monitor-service', () => ({ memoryMonitorService: { registerCleanupHandler: vi.fn() } }));
vi.mock('../src/lib/canvas/canvas-export', () => ({ exportCanvasNodes: mocks.exportNodes }));
vi.mock('../src/lib/canvas/node-registry', () => ({ getNodeDefinition: (type: string) => ({ title: type }) }));
vi.mock('../src/pages/prompts/components/prompt-detail-dialog', () => ({ PromptDetailDialog: () => null }));
vi.mock('../src/services/api/prompts', () => ({ fetchSourcePrompts: vi.fn() }));
vi.mock('../src/stores/use-asset-store', () => ({ useAssetStore: vi.fn() }));
vi.mock('../src/hooks/use-asset-media', () => ({ useAssetMedia: vi.fn() }));
vi.mock('../src/stores/use-prompt-source-store', () => ({ usePromptSourceStore: vi.fn() }));
vi.mock('../src/hooks/use-compact-screen', () => ({ useCompactScreen: () => mocks.compact }));

const node = (id: string, type = CanvasNodeType.Text, metadata = {}): CanvasNodeData => ({ id, title: id, type, position: { x: 0, y: 0 }, width: 200, height: 200, metadata });
const fixture = [node('group', CanvasNodeType.Group), node('image-one', CanvasNodeType.Image, { groupId: 'group', storageKey: 'image:views', status: 'success' }), node('text-one', CanvasNodeType.Text, { content: 'find me' }), node('empty-image', CanvasNodeType.Image)];
const focus = vi.fn();
const preview = vi.fn();
let observers: Array<{ element?: Element; callback: IntersectionObserverCallback }> = [];
const renderPanel = (nodes = fixture) => render(<div id="opentu-workflow-root"><ConfigProvider theme={{ token: { motion: false } }}><I18nextProvider i18n={i18n}><App><CanvasNodesTab nodes={nodes} selectedNodeIds={new Set()} onFocusNode={focus} onPreviewNode={preview} theme={canvasThemes.light} /></App></I18nextProvider></ConfigProvider></div>);
const intersect = (visible: boolean) => act(() => observers.forEach(observer => observer.callback([{ isIntersecting: visible }] as IntersectionObserverEntry[], {} as IntersectionObserver)));

beforeEach(async () => {
    vi.clearAllMocks(); localStorage.clear(); observers = []; mocks.compact = false;
    useCanvasSidePanelStore.setState({ nodeViewMode: 'list' });
    await i18n.changeLanguage('zh-CN');
    mocks.preview.mockResolvedValue(new Blob(['thumbnail']));
    mocks.original.mockResolvedValue(new Blob(['original']));
    mocks.exportNodes.mockResolvedValue(undefined);
    vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('IntersectionObserver', class {
        item: { element?: Element; callback: IntersectionObserverCallback };
        constructor(callback: IntersectionObserverCallback) { this.item = { callback }; observers.push(this.item); }
        observe(element: Element) { this.item.element = element; }
        disconnect() { observers = observers.filter(item => item !== this.item); }
    });
    vi.stubGlobal('URL', class extends URL { static createObjectURL = () => 'blob:thumbnail'; static revokeObjectURL = vi.fn(); });
    const computedStyle = window.getComputedStyle(document.createElement('div'));
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedStyle);
});
afterEach(() => { cleanup(); imageLeaseCache.trim(true); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('canvas node views', () => {
    it('persists the view without focusing or changing nodes, including remount', () => {
        const view = renderPanel();
        fireEvent.click(screen.getByRole('button', { name: '切换为缩略图' }));
        expect(localStorage.getItem('canvas-side-panel-node-view')).toBe('grid');
        expect(document.querySelector('[data-canvas-node-view="grid"]')).toBeTruthy();
        expect(focus).not.toHaveBeenCalled();
        view.unmount(); renderPanel();
        expect(screen.getByRole('button', { name: '切换为列表' })).toBeTruthy();
    });
    it.each(['list', 'grid'] as const)('keeps group collapse, searching and focus in %s view', mode => {
        useCanvasSidePanelStore.setState({ nodeViewMode: mode }); renderPanel();
        fireEvent.click(screen.getByRole('button', { name: 'group', exact: true }));
        expect(screen.queryByRole('button', { name: '定位到节点：image-one' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'group', exact: true }));
        fireEvent.click(screen.getByRole('button', { name: '定位到节点：image-one' }));
        expect(focus).toHaveBeenCalledWith('image-one');
        fireEvent.change(screen.getByPlaceholderText('搜索节点'), { target: { value: 'find me' } });
        expect(screen.getByRole('button', { name: '定位到节点：text-one' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: '定位到节点：image-one' })).toBeNull();
    });
    it('exports the same checked nodes after switching view', async () => {
        renderPanel(); fireEvent.click(screen.getByRole('button', { name: '选择', exact: true }));
        fireEvent.click(screen.getByRole('button', { name: '选择：image-one' }));
        fireEvent.click(screen.getByRole('button', { name: '切换为缩略图' }));
        fireEvent.click(screen.getByRole('button', { name: '导出选中' }));
        await waitFor(() => expect(mocks.exportNodes).toHaveBeenCalledWith([fixture[1]], expect.any(String)));
        expect(focus).not.toHaveBeenCalled();
    });
    it('loads only visible stored thumbnails and releases leases on unmount', async () => {
        const view = renderPanel();
        expect(mocks.preview).not.toHaveBeenCalled(); expect(mocks.original).not.toHaveBeenCalled();
        intersect(true);
        await waitFor(() => expect(mocks.preview).toHaveBeenCalledWith('image:views'));
        expect(mocks.original).not.toHaveBeenCalled();
        expect(imageLeaseCache.stats().active).toBe(1);
        view.unmount(); expect(imageLeaseCache.stats().active).toBe(0);
    });
    it('keeps a touch-accessible preview separate from focus, without autoplay media', () => {
        mocks.compact = true; useCanvasSidePanelStore.setState({ nodeViewMode: 'grid' }); renderPanel();
        const item = document.querySelector('[data-canvas-node-item="image-one"]') as HTMLElement;
        fireEvent.click(within(item).getByRole('button', { name: '放大预览：image-one' }));
        expect(preview).toHaveBeenCalledWith('image-one'); expect(focus).not.toHaveBeenCalled();
        expect(document.querySelector('video,audio')).toBeNull();
    });
});
