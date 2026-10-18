import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PlaitBoard, Transforms, type PlaitElement } from '@plait/core';
import { PlaitDrawElement } from '@plait/draw';
import { EnhancementPanel } from './EnhancementPanel';
import { enhancementConfig, enhancementOriginal, enhancementResult, enhancementRevision, enhancementSnapshot, fetchEnhancementSource,
  newEnhancement, subscribeEnhancement, trackEnhancement, type EnhancementModel, type EnhancementRef, type EnhancementScale } from '../../services/image-enhancement';
import { unifiedCacheService } from '../../services/unified-cache-service';
import { createImageThumbnail } from '../../workflow-mode/web/src/lib/image-thumbnail';

type ImageElement = PlaitElement & { url: string; enhancementEligibleAt?: number; enhancement?: EnhancementRef & {
  original: { url: string; width?: number; height?: number }; applied?: boolean; width?: number; height?: number; previewUrl?: string;
} };
const EVENT = 'opentu:enhance-image';
export const openFreeCanvasEnhancement = (id: string) => window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));

function allImages(elements: readonly PlaitElement[]): ImageElement[] {
  return elements.flatMap(element => PlaitDrawElement.isDrawElement(element) && PlaitDrawElement.isImage(element)
    ? [element as ImageElement] : Array.isArray(element.children) ? allImages(element.children as PlaitElement[]) : []);
}

export default function FreeCanvasEnhancement({ board, value }: { board: PlaitBoard | null; value: PlaitElement[] }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [resultUrl, setResultUrl] = useState<string>();
  const applying = useRef(new Set<string>());
  const boardRef = useRef(board); boardRef.current = board;
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const revision = useSyncExternalStore(subscribeEnhancement, enhancementRevision);
  const selected = allImages(board?.children || value).find(image => image.id === selectedId);
  const patch = useCallback((id: string, update: (image: ImageElement) => Partial<ImageElement>) => {
    if (!board) return;
    const current = allImages(board.children).find(image => image.id === id);
    if (current) Transforms.setNode(board, update(current), PlaitBoard.findPath(board, current));
  }, [board]);
  useEffect(() => {
    const open = (event: Event) => setSelectedId((event as CustomEvent<string>).detail);
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, []);

  useEffect(() => {
    if (!board) return;
    let disposed = false;
    void enhancementConfig().then(config => {
      if (!config.enabled || disposed) return;
      for (const image of allImages(board.children)) {
        const ref = image.enhancement;
        if (!ref && image.enhancementEligibleAt && config.automatic) {
          void (async () => {
            const blob = await unifiedCacheService.getCachedBlob(image.url) || await fetchEnhancementSource(image.url);
            const bitmap = await createImageBitmap(blob);
            const width = bitmap.width, height = bitmap.height; bitmap.close();
            if (disposed || Math.max(width, height) > 2048) return;
            patch(image.id, current => current.enhancement ? {} : { enhancement: {
              ...newEnhancement(Math.max(width, height) <= 1024 ? 4 : 2), original: { url: image.url, width, height },
            } });
          })().catch(console.error);
          continue;
        }
        if (!ref || ref.applied) continue;
        const task = enhancementSnapshot(ref.requestId);
        if (task?.status === 'completed' && !applying.current.has(ref.requestId)) {
          applying.current.add(ref.requestId);
          void (async () => {
            const blob = await enhancementResult(ref.requestId);
            if (!blob || !mounted.current || boardRef.current !== board) return;
            const url = `/__aitu_cache__/image/enhancement-${ref.requestId}.png`;
            await unifiedCacheService.cacheMediaFromBlob(url, blob, 'image');
            const preview = await createImageThumbnail(blob);
            const previewUrl = preview ? `/__aitu_cache__/image/enhancement-${ref.requestId}-preview.webp` : undefined;
            if (preview && previewUrl) await unifiedCacheService.cacheMediaFromBlob(previewUrl, preview, 'image');
            if (!mounted.current || boardRef.current !== board) return;
            patch(image.id, current => current.enhancement?.requestId !== ref.requestId ? {} : {
              url, enhancement: { ...ref, applied: true, width: task.width, height: task.height, previewUrl },
            });
          })().catch(console.error).finally(() => applying.current.delete(ref.requestId));
        } else if (!task) {
          void trackEnhancement(ref, async () => await unifiedCacheService.getCachedBlob(ref.original.url) || fetchEnhancementSource(ref.original.url));
        }
      }
    });
    return () => { disposed = true; };
  }, [board, value, revision, patch]);

  useEffect(() => {
    let disposed = false;
    const urls: string[] = [];
    setOriginalUrl(undefined); setResultUrl(undefined);
    if (selected) void (async () => {
      const original = selected.enhancement?.original.url || selected.url;
      const blob = (selected.enhancement ? await enhancementOriginal(selected.enhancement.requestId) : null) || await unifiedCacheService.getCachedBlob(original);
      const url = blob ? URL.createObjectURL(blob) : original;
      if (blob) urls.push(url);
      if (!disposed) setOriginalUrl(url);
      if (selected.enhancement?.applied) {
        const result = await enhancementResult(selected.enhancement.requestId);
        if (result) {
          const resultObjectUrl = URL.createObjectURL(result); urls.push(resultObjectUrl);
          if (!disposed) setResultUrl(resultObjectUrl);
        }
      }
      if (disposed) urls.forEach(url => URL.revokeObjectURL(url));
    })().catch(console.error);
    return () => { disposed = true; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [selected?.id, selected?.url, selected?.enhancement?.requestId]);

  const start = (scale: EnhancementScale, model: EnhancementModel) => selected && patch(selected.id, current => ({
    enhancement: { ...newEnhancement(scale, model), original: current.enhancement?.original || { url: current.url } },
  }));
  return selected ? <EnhancementPanel open onClose={() => setSelectedId(undefined)} enhancement={selected.enhancement}
    onStart={start} originalUrl={originalUrl} resultUrl={resultUrl}
    width={selected.enhancement?.original.width} height={selected.enhancement?.original.height} /> : null;
}
