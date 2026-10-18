import type { CanvasNodeData, ViewportTransform } from "@/types/canvas";

export type CanvasFocusFrame = { left: number; top: number; right: number; bottom: number };

export function focusViewportForNode(node: CanvasNodeData, frame: CanvasFocusFrame, overlays: { above?: number; below?: number } = {}): ViewportTransform {
    const width = Math.max(1, frame.right - frame.left);
    const height = Math.max(1, frame.bottom - frame.top);
    const above = overlays.above || 0;
    const below = overlays.below || 0;
    const k = Math.min(1, Math.max(0.05, Math.min(width * 0.9 / node.width, (height - above - below) / node.height)));
    const nodeHeight = node.height * k;
    const centerX = (frame.left + frame.right) / 2;
    const top = frame.top + Math.max(0, (height - nodeHeight - above - below) / 2) + above;
    return { x: centerX - (node.position.x + node.width / 2) * k, y: top - node.position.y * k, k };
}

export function measureCanvasFocus(container: HTMLElement, nodeId: string) {
    const rect = container.getBoundingClientRect();
    const section = container.parentElement!;
    const root = container.closest("#opentu-workflow-root") || section;
    const topbar = section.querySelector(".workflow-canvas-topbar,.workflow-mobile-canvas-topbar")?.getBoundingClientRect();
    const dock = section.querySelector("[data-canvas-bottom-toolbar]")?.getBoundingClientRect();
    const mobileEditor = root.querySelector("[data-canvas-mobile-editor]")?.closest(".ant-drawer-content-wrapper");
    const editor = mobileEditor?.closest(".ant-drawer-open") ? mobileEditor.getBoundingClientRect() : undefined;
    const node = Array.from(container.querySelectorAll<HTMLElement>("[data-node-id]")).find(element => element.dataset.nodeId === nodeId);
    const panel = node?.querySelector("[data-node-panel]")?.getBoundingClientRect();
    const toolbar = Array.from(section.querySelectorAll<HTMLElement>("[data-node-toolbar]")).find(element => element.dataset.nodeToolbar === nodeId)?.getBoundingClientRect();
    return {
        frame: { left: 16, right: rect.width - 16, top: Math.max(16, (topbar?.bottom || rect.top) - rect.top + 16), bottom: Math.min(rect.bottom, dock?.top ?? rect.bottom, editor?.top ?? rect.bottom) - rect.top - 16 },
        overlays: { above: toolbar ? toolbar.height + 14 : 16, below: panel?.height || 0 },
    };
}
