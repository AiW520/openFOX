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
  target?: 'workflow';
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

type PrefillTarget = 'default' | 'workflow';
const prefillConsumerCounts = new Map<PrefillTarget, number>();
const pendingPrefills = new Map<PrefillTarget, AIInputPrefillEventDetail>();

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

  const target = detail.target || 'default';
  if (!prefillConsumerCounts.get(target)) {
    pendingPrefills.set(target, detail);
    return;
  }
  pendingPrefills.delete(target);
  window.dispatchEvent(new CustomEvent(AI_INPUT_PREFILL_EVENT, { detail }));
}

export function registerAIInputPrefillConsumer(
  consumer: (detail: AIInputPrefillEventDetail) => void,
  target: PrefillTarget = 'default'
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handlePrefill = (event: Event) => {
    const detail = (event as CustomEvent<AIInputPrefillEventDetail>).detail;
    if (detail && (detail.target || 'default') === target) consumer(detail);
  };

  let active = true;
  prefillConsumerCounts.set(target, (prefillConsumerCounts.get(target) || 0) + 1);
  window.addEventListener(AI_INPUT_PREFILL_EVENT, handlePrefill);

  const queued = pendingPrefills.get(target);
  if (queued) {
    queueMicrotask(() => {
      if (!active || pendingPrefills.get(target) !== queued) return;
      pendingPrefills.delete(target);
      consumer(queued);
    });
  }

  return () => {
    active = false;
    window.removeEventListener(AI_INPUT_PREFILL_EVENT, handlePrefill);
    prefillConsumerCounts.set(target, Math.max(0, (prefillConsumerCounts.get(target) || 0) - 1));
  };
}
