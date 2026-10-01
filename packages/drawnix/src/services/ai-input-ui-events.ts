import type { GenerationType } from '../utils/ai-input-parser';
import type { ModelRef } from '../utils/settings-manager';
import type { KnowledgeContextRef } from '../types/task.types';

export interface AIInputFocusEventDetail {
  generationType?: GenerationType;
  skillId?: string;
  pptExplainerSource?: 'topic' | 'current_ppt';
  pptExplainerFrameIds?: string[];
  openPptExplainer?: boolean;
}

export interface AIInputPrefillImage {
  url: string;
  name: string;
  width?: number;
  height?: number;
  maskImage?: string;
}

export type AIInputPrefillSource =
  | 'canvas-toolbar'
  | 'task-queue'
  | 'dialog'
  | 'new-experience';

export interface AIInputPrefillEventDetail {
  generationType: GenerationType;
  prompt: string;
  images?: AIInputPrefillImage[];
  model?: string;
  modelRef?: ModelRef | null;
  params?: Record<string, string>;
  count?: number;
  knowledgeContextRefs?: KnowledgeContextRef[];
  source?: AIInputPrefillSource;
}

export const AI_INPUT_FOCUS_EVENT = 'aitu:ai-input-focus';
export const AI_INPUT_PREFILL_EVENT = 'aitu:ai-input-prefill';

let prefillConsumerCount = 0;
let pendingPrefill: AIInputPrefillEventDetail | null = null;

export function resolvePptExplainerFrameIds(
  orderedFrameIds: readonly string[],
  selectedFrameIds: ReadonlySet<string>
): string[] | undefined {
  const selected = orderedFrameIds.filter((frameId) =>
    selectedFrameIds.has(frameId)
  );
  return selected.length > 0 ? selected : undefined;
}

export function updatePptExplainerFrameSelection(
  selectedFrameIds: ReadonlySet<string>,
  frameId: string,
  checked: boolean
): Set<string> {
  const next = new Set(selectedFrameIds);
  if (checked) {
    next.add(frameId);
  } else {
    next.delete(frameId);
  }
  return next;
}

export function requestAIInputFocus(
  detail: AIInputFocusEventDetail = {}
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(AI_INPUT_FOCUS_EVENT, { detail }));
}

export function requestAIInputPrefill(detail: AIInputPrefillEventDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (prefillConsumerCount === 0) {
    pendingPrefill = detail;
    return;
  }
  window.dispatchEvent(new CustomEvent(AI_INPUT_PREFILL_EVENT, { detail }));
}

export function registerAIInputPrefillConsumer(
  consumer: (detail: AIInputPrefillEventDetail) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handlePrefill = (event: Event) => {
    const detail = (event as CustomEvent<AIInputPrefillEventDetail>).detail;
    if (detail) consumer(detail);
  };

  prefillConsumerCount += 1;
  window.addEventListener(AI_INPUT_PREFILL_EVENT, handlePrefill);

  const queued = pendingPrefill;
  pendingPrefill = null;
  if (queued) {
    queueMicrotask(() => consumer(queued));
  }

  return () => {
    window.removeEventListener(AI_INPUT_PREFILL_EVENT, handlePrefill);
    prefillConsumerCount = Math.max(0, prefillConsumerCount - 1);
  };
}
