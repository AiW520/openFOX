import { describe, expect, it, vi } from 'vitest';
import {
  AI_INPUT_FOCUS_EVENT,
  registerAIInputPrefillConsumer,
  requestAIInputPrefill,
  requestAIInputFocus,
  resolvePptExplainerFrameIds,
  updatePptExplainerFrameSelection,
} from './ai-input-ui-events';

describe('ai-input-ui-events', () => {
  it('dispatches focus request detail', () => {
    const handler = vi.fn();
    window.addEventListener(AI_INPUT_FOCUS_EVENT, handler);

    requestAIInputFocus({
      generationType: 'agent',
      skillId: 'generate_ppt',
      pptExplainerSource: 'current_ppt',
      pptExplainerFrameIds: ['frame-2', 'frame-4'],
      openPptExplainer: true,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      detail: {
        generationType: 'agent',
        skillId: 'generate_ppt',
        pptExplainerSource: 'current_ppt',
        pptExplainerFrameIds: ['frame-2', 'frame-4'],
        openPptExplainer: true,
      },
    });

    window.removeEventListener(AI_INPUT_FOCUS_EVENT, handler);
  });

  it('resolves selected pages in PPT order and falls back to all when empty', () => {
    expect(
      resolvePptExplainerFrameIds(
        ['frame-1', 'frame-2', 'frame-3'],
        new Set(['frame-3', 'frame-1'])
      )
    ).toEqual(['frame-1', 'frame-3']);
    expect(
      resolvePptExplainerFrameIds(
        ['frame-1', 'frame-2'],
        new Set(['not-a-ppt-frame'])
      )
    ).toBeUndefined();
  });

  it('updates the checked PPT explainer references without mutating selection', () => {
    const current = new Set(['frame-1', 'frame-2']);

    expect(updatePptExplainerFrameSelection(current, 'frame-3', true)).toEqual(
      new Set(['frame-1', 'frame-2', 'frame-3'])
    );
    expect(updatePptExplainerFrameSelection(current, 'frame-1', false)).toEqual(
      new Set(['frame-2'])
    );
    expect(current).toEqual(new Set(['frame-1', 'frame-2']));
  });

  it('delivers a prefill queued before the canvas input mounts exactly once', async () => {
    const detail = {
      generationType: 'image' as const,
      prompt: 'editorial product photo',
      model: 'image-model',
      params: { size: '1:1' },
      source: 'new-experience' as const,
    };
    const consumer = vi.fn();

    requestAIInputPrefill(detail);
    const unregister = registerAIInputPrefillConsumer(consumer);
    await Promise.resolve();

    expect(consumer).toHaveBeenCalledTimes(1);
    expect(consumer).toHaveBeenCalledWith(detail);
    unregister();
  });

  it('dispatches a prefill immediately when the canvas input is mounted', () => {
    const consumer = vi.fn();
    const unregister = registerAIInputPrefillConsumer(consumer);
    const detail = {
      generationType: 'video' as const,
      prompt: 'slow camera move',
      model: 'video-model',
    };

    requestAIInputPrefill(detail);

    expect(consumer).toHaveBeenCalledTimes(1);
    expect(consumer).toHaveBeenCalledWith(detail);
    unregister();
  });
});
