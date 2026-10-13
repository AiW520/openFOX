import React, { createRef } from 'react';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfiniteCanvas } from '../src/components/canvas/infinite-canvas';
import { COMPACT_QUERY, useCompactScreen } from '../../../hooks/use-compact-screen';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function pointer(target: EventTarget, type: string, id: number, x: number, y: number) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 });
    Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' } });
    fireEvent(target, event);
}

function canvas() {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
    const ref = createRef<HTMLDivElement>();
    const change = vi.fn();
    const deselect = vi.fn();
    render(<InfiniteCanvas containerRef={ref} viewport={{ x: 0, y: 0, k: 1 }} tool="select" onViewportChange={change} onCanvasDeselect={deselect}>
        <div data-node-id="node" /><button data-canvas-no-zoom>Overlay</button>
    </InfiniteCanvas>);
    ref.current!.setPointerCapture = vi.fn();
    return { root: ref.current!, change, deselect };
}

describe('mobile presentation', () => {
    it('responds to orientation changes and releases the subscription', () => {
        const media = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        const match = vi.fn(() => media);
        vi.stubGlobal('matchMedia', match);
        const hook = renderHook(useCompactScreen);
        expect(hook.result.current).toBe(true);
        expect(match).toHaveBeenCalledWith(COMPACT_QUERY);
        const update = media.addEventListener.mock.calls[0][1];
        act(() => { media.matches = false; update(); });
        expect(hook.result.current).toBe(false);
        hook.unmount();
        expect(media.removeEventListener).toHaveBeenCalledWith('change', update);
    });
});

describe('touch canvas navigation', () => {
    it('pans with one finger and ignores unrelated pointer release', () => {
        const { root, change } = canvas();
        pointer(root, 'pointerdown', 1, 20, 20);
        pointer(window, 'pointerup', 2, 20, 20);
        pointer(window, 'pointermove', 1, 50, 60);
        expect(change).toHaveBeenLastCalledWith({ x: 30, y: 40, k: 1 });
        pointer(window, 'pointerup', 1, 50, 60);
        change.mockClear();
        pointer(window, 'pointermove', 1, 70, 80);
        expect(change).not.toHaveBeenCalled();
    });

    it('anchors pinch zoom and resets on cancellation before the next gesture', () => {
        const { root, change, deselect } = canvas();
        pointer(root, 'pointerdown', 1, 100, 100);
        pointer(root, 'pointerdown', 2, 200, 100);
        pointer(window, 'pointermove', 2, 300, 100);
        expect(change).toHaveBeenLastCalledWith({ x: -100, y: -100, k: 2 });
        pointer(window, 'pointercancel', 1, 100, 100);
        pointer(window, 'pointerup', 2, 300, 100);
        change.mockClear();
        pointer(root, 'pointerdown', 3, 20, 20);
        pointer(window, 'pointermove', 3, 30, 40);
        expect(change).toHaveBeenLastCalledWith({ x: 10, y: 20, k: 1 });
        pointer(window, 'pointercancel', 3, 30, 40);
        expect(deselect).not.toHaveBeenCalled();
    });

    it('leaves overlays and node events alone and clears touches on blur', () => {
        const { root, change } = canvas();
        pointer(root.querySelector('button')!, 'pointerdown', 1, 20, 20);
        pointer(root.querySelector('[data-node-id]')!, 'pointerdown', 2, 30, 20);
        pointer(window, 'pointermove', 1, 90, 20);
        expect(change).not.toHaveBeenCalled();
        pointer(root, 'pointerdown', 3, 20, 20);
        fireEvent(window, new Event('blur'));
        pointer(window, 'pointermove', 3, 90, 20);
        expect(change).not.toHaveBeenCalled();
        pointer(root, 'pointerdown', 4, 20, 20);
        pointer(window, 'pointermove', 4, 30, 40);
        expect(change).toHaveBeenLastCalledWith({ x: 10, y: 20, k: 1 });
    });
});
