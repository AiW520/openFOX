import { describe, expect, it } from 'vitest';
import { cloneCanvasNodes } from '@/lib/canvas/canvas-node-copy';
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from '@/types/canvas';

const node = (id: string): CanvasNodeData => ({ id, title: id, type: CanvasNodeType.Image, position: { x: 10, y: 20 }, width: 300, height: 200 });
const connection = (fromNodeId: string, toNodeId: string): CanvasConnection => ({ id: `${fromNodeId}-${toNodeId}`, fromNodeId, toNodeId });

describe('independent canvas copies', () => {
    it('keeps incoming references and excludes downstream connections', () => {
        const copy = cloneCanvasNodes([node('target')], [connection('source', 'target'), connection('target', 'downstream')], new Set(['source', 'target', 'downstream']), { x: 36, y: 36 });
        expect(copy.connections).toEqual([expect.objectContaining({ fromNodeId: 'source', toNodeId: copy.nodes[0].id })]);
        expect(copy.nodes[0].position).toEqual({ x: 46, y: 56 });
    });
    it('remaps sources copied in the same selection', () => {
        const copy = cloneCanvasNodes([node('source'), node('target')], [connection('source', 'target')], new Set(), { x: 0, y: 0 });
        expect(copy.connections[0]).toMatchObject({ fromNodeId: copy.nodes[0].id, toNodeId: copy.nodes[1].id });
    });
    it('drops deleted references and duplicate edges', () => {
        const copy = cloneCanvasNodes([node('target')], [connection('deleted', 'target'), connection('source', 'target'), connection('source', 'target')], new Set(['source']), { x: 0, y: 0 });
        expect(copy.connections).toHaveLength(1);
        expect(copy.connections[0].fromNodeId).toBe('source');
    });
    it('shares static bytes but removes task and enhancement ownership', () => {
        const source = node('target');
        source.metadata = { status: 'loading', content: 'blob:existing', workflowTasks: { image: { id: 'task', scopeId: 'scope', kind: 'image' } }, videoTaskId: 'video-task', primaryImageId: 'image', images: [{ id: 'image', status: 'success', content: 'blob:existing', storageKey: 'stored', naturalWidth: 100, naturalHeight: 100, bytes: 20, mimeType: 'image/png', enhancementEligibleAt: 1, enhancement: { requestId: 'enhancement' } as never }] };
        const copy = cloneCanvasNodes([source], [], new Set(), { x: 0, y: 0 }).nodes[0];
        expect(copy.metadata).toMatchObject({ status: 'success', content: 'blob:existing' });
        expect(copy.metadata?.workflowTasks).toBeUndefined();
        expect(copy.metadata?.videoTaskId).toBeUndefined();
        const image = copy.metadata!.images![0];
        expect(image.id).not.toBe('image');
        expect(copy.metadata?.primaryImageId).toBe(image.id);
        expect(image.storageKey).toBe('stored');
        expect(image.enhancement).toBeUndefined();
        expect(image.enhancementEligibleAt).toBeUndefined();
        expect(source.metadata.images![0].enhancement?.requestId).toBe('enhancement');
        expect(source.metadata.status).toBe('loading');
    });
    it('does not leave copied empty tasks loading forever', () => {
        const source = { ...node('pending'), metadata: { status: 'loading' as const, content: '', workflowTasks: { pending: { id: 'task', scopeId: 'scope', kind: 'image' as const } } } };
        const copy = cloneCanvasNodes([source], [], new Set(), { x: 0, y: 0 }).nodes[0];
        expect(copy.metadata?.status).toBe('idle');
        expect(copy.metadata?.workflowTasks).toBeUndefined();
    });
    it('remaps group membership only within copied groups', () => {
        const group = { ...node('group'), type: CanvasNodeType.Group };
        const member = { ...node('member'), metadata: { groupId: 'group' } };
        const copy = cloneCanvasNodes([group, member], [], new Set(['group']), { x: 0, y: 0 });
        expect(copy.nodes[1].metadata?.groupId).toBe(copy.nodes[0].id);
        expect(cloneCanvasNodes([member], [], new Set(['group']), { x: 0, y: 0 }).nodes[0].metadata?.groupId).toBeUndefined();
    });
});
