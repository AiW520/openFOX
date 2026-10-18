import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { enhancementConfig, enhancementResult, enhancementRevision, enhancementSnapshot, fetchEnhancementSource,
  newEnhancement, subscribeEnhancement, trackEnhancement, type EnhancementModel, type EnhancementScale } from '../../../../../services/image-enhancement';
import { getImageBlob, uploadImage } from '@/services/image-storage';
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeImage } from '@/types/canvas';

function images(node: CanvasNodeData) {
  if (node.type !== CanvasNodeType.Image) return [];
  if (node.metadata?.images?.length) return node.metadata.images;
  if (!node.metadata?.content) return [];
  return [{ ...node.metadata, id: node.id } as CanvasNodeImage];
}

export function updateEnhancedImage(node: CanvasNodeData, imageId: string, update: (image: CanvasNodeImage) => CanvasNodeImage): CanvasNodeData {
  const current = images(node);
  if (!current.some(image => image.id === imageId)) return node;
  const next = current.map(image => image.id === imageId ? update(image) : image);
  const primary = next.find(image => image.id === node.metadata?.primaryImageId) || next[0];
  return { ...node, metadata: { ...node.metadata, images: next, primaryImageId: primary.id,
    content: primary.content, storageKey: primary.storageKey, naturalWidth: primary.naturalWidth,
    naturalHeight: primary.naturalHeight, bytes: primary.bytes, mimeType: primary.mimeType } };
}

export function useImageEnhancement(nodes: CanvasNodeData[], setNodes: (update: (nodes: CanvasNodeData[]) => CanvasNodeData[]) => void, ready: boolean, scopeId?: string) {
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const scopeRef = useRef(scopeId); scopeRef.current = scopeId;
  const applying = useRef(new Set<string>());
  const revision = useSyncExternalStore(subscribeEnhancement, enhancementRevision);
  const start = useCallback((nodeId: string, scale: EnhancementScale, model: EnhancementModel) => {
    setNodes(previous => previous.map(node => {
      if (node.id !== nodeId) return node;
      const image = images(node).find(item => item.id === node.metadata?.primaryImageId) || images(node)[0];
      if (!image) return node;
      const source = image.enhancement?.original || { content: image.content, storageKey: image.storageKey,
        naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, bytes: image.bytes, mimeType: image.mimeType };
      return updateEnhancedImage(node, image.id, current => ({ ...current,
        enhancement: { ...newEnhancement(scale, model), original: source } }));
    }));
  }, [setNodes]);

  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    void enhancementConfig().then(config => {
      if (!config.enabled || disposed) return;
      for (const node of nodes) for (const image of images(node)) {
        if (!image.enhancement && image.enhancementEligibleAt && image.status === 'success' && config.automatic) {
          const edge = Math.max(image.naturalWidth, image.naturalHeight);
          if (!edge || edge > 2048) continue;
          setNodes(previous => previous.map(item => item.id === node.id ? updateEnhancedImage(item, image.id, current => current.enhancement ? current : {
            ...current, enhancement: { ...newEnhancement(edge <= 1024 ? 4 : 2), original: {
              content: current.content, storageKey: current.storageKey, naturalWidth: current.naturalWidth,
              naturalHeight: current.naturalHeight, bytes: current.bytes, mimeType: current.mimeType } },
          }) : item));
          continue;
        }
        const ref = image.enhancement;
        if (!ref || ref.applied) continue;
        const task = enhancementSnapshot(ref.requestId);
        if (task?.status === 'completed' && !applying.current.has(ref.requestId)) {
          applying.current.add(ref.requestId);
          void (async () => {
            const blob = await enhancementResult(ref.requestId);
            if (!blob || !mounted.current || scopeRef.current !== scopeId) return;
            const uploaded = await uploadImage(blob);
            if (!mounted.current || scopeRef.current !== scopeId) return;
            setNodes(previous => previous.map(item => item.id === node.id ? updateEnhancedImage(item, image.id, current =>
              current.enhancement?.requestId !== ref.requestId ? current : { ...current, content: uploaded.url,
                storageKey: uploaded.storageKey, naturalWidth: uploaded.width, naturalHeight: uploaded.height,
                bytes: uploaded.bytes, mimeType: uploaded.mimeType, enhancement: { ...ref, applied: true } }) : item));
          })().catch(console.error).finally(() => applying.current.delete(ref.requestId));
        } else if (!task) {
          void trackEnhancement(ref, async () => {
            const source = ref.original;
            const blob = source.storageKey ? await getImageBlob(source.storageKey) : null;
            return blob || fetchEnhancementSource(source.content);
          });
        }
      }
    });
    return () => { disposed = true; };
  }, [nodes, ready, revision, setNodes, scopeId]);
  return start;
}
