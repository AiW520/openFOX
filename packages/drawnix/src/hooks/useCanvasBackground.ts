import { PlaitBoard } from '@plait/core';
import { useEffect } from 'react';

export function useCanvasBackground(board: PlaitBoard | null, enabled: boolean) {
  useEffect(() => {
    if (!board || !enabled) return;
    const host = PlaitBoard.getHost(board);
    const update = () => {
      const { x, y } = host.viewBox.baseVal;
      const zoom = board.viewport.zoom;
      const spacing = 22 * zoom;
      // Anchor the CSS pattern to world coordinates as Plait expands its SVG.
      host.style.setProperty('--aitu-canvas-grid-spacing', `${spacing}px`);
      host.style.setProperty('--aitu-canvas-grid-position', `${(-x * zoom) % spacing}px ${(-y * zoom) % spacing}px`);
      host.style.setProperty('--aitu-canvas-grid-radius', `${0.8 * zoom}px`);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(host, { attributes: true, attributeFilter: ['viewBox'] });
    return () => {
      observer.disconnect();
      host.style.removeProperty('--aitu-canvas-grid-spacing');
      host.style.removeProperty('--aitu-canvas-grid-position');
      host.style.removeProperty('--aitu-canvas-grid-radius');
    };
  }, [board, enabled]);
}
