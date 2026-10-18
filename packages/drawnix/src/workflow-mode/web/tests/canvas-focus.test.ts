import { describe, expect, it } from 'vitest';
import { focusViewportForNode, measureCanvasFocus } from '@/lib/canvas/canvas-focus';
import { CanvasNodeType, type CanvasNodeData } from '@/types/canvas';

const node: CanvasNodeData = { id: 'node', title: 'Image', type: CanvasNodeType.Image, position: { x: 9000, y: -5000 }, width: 800, height: 600 };
describe('focus framing', () => {
    it('fits the node and fixed-size overlays inside the available frame', () => {
        const frame = { left: 16, top: 80, right: 1100, bottom: 750 };
        const viewport = focusViewportForNode(node, frame, { above: 64, below: 300 });
        const left = viewport.x + node.position.x * viewport.k;
        const top = viewport.y + node.position.y * viewport.k;
        expect(left).toBeGreaterThanOrEqual(frame.left);
        expect(left + node.width * viewport.k).toBeLessThanOrEqual(frame.right);
        expect(top - 64).toBeGreaterThanOrEqual(frame.top);
        expect(top + node.height * viewport.k + 300).toBeLessThanOrEqual(frame.bottom);
    });
    it('frames a node in the remaining mobile area without enlarging it', () => {
        const frame = { left: 16, top: 64, right: 374, bottom: 330 };
        const viewport = focusViewportForNode(node, frame);
        expect(viewport.k).toBeLessThanOrEqual(1);
        expect(viewport.y + node.position.y * viewport.k).toBeGreaterThanOrEqual(frame.top);
        expect(viewport.y + (node.position.y + node.height) * viewport.k).toBeLessThanOrEqual(frame.bottom);
    });
    it('accounts for the actual topbar and dock in screen coordinates', () => {
        const section = document.createElement('section');
        section.innerHTML = '<div class="workflow-canvas-topbar"></div><div data-surface></div><div data-canvas-bottom-toolbar></div>';
        const surface = section.querySelector<HTMLElement>('[data-surface]')!;
        surface.getBoundingClientRect = () => ({ top: 100, bottom: 900, width: 1200, height: 800 } as DOMRect);
        section.querySelector('.workflow-canvas-topbar')!.getBoundingClientRect = () => ({ bottom: 164 } as DOMRect);
        section.querySelector('[data-canvas-bottom-toolbar]')!.getBoundingClientRect = () => ({ top: 820 } as DOMRect);
        expect(measureCanvasFocus(surface, 'node').frame).toEqual({ left: 16, right: 1184, top: 80, bottom: 704 });
    });
});
