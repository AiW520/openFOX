import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaitBoard } from '@plait/core';
import { TaskStatus, TaskType } from '../../types/task.types';
import { IMAGE_GENERATION_ANCHOR_RETRY_EVENT, type PlaitImageGenerationAnchor } from '../../types/image-generation-anchor.types';
import { ImageGenerationAnchorContent } from './ImageGenerationAnchorContent';

const mocks = vi.hoisted(() => ({ tasks: [] as any[], retryTask: vi.fn(), updateAnchor: vi.fn() }));
vi.mock('../../hooks/useImageGenerationAnchorController', () => ({
  useImageGenerationAnchorController: () => ({ viewModel: {
    anchorType: 'frame', phase: 'failed', progressMode: 'hidden', progress: null,
    phaseLabel: '图片加载失败', primaryAction: { type: 'retry', label: '恢复图片' },
    transitionMode: 'hold', tone: 'danger', error: 'Failed to fetch', isTerminal: true,
  } }),
}));
vi.mock('../../services/task-queue', () => ({ taskQueueService: { getAllTasks: () => mocks.tasks, retryTask: mocks.retryTask } }));
vi.mock('../../services/workflow-completion-service', () => ({ workflowCompletionService: { getPostProcessingStatus: () => ({ status: 'failed' }) } }));
vi.mock('./image-generation-anchor.transforms', () => ({ ImageGenerationAnchorTransforms: { updateAnchor: mocks.updateAnchor } }));
vi.mock('../shared/ImageGenerationProgressDisplay', () => ({ ImageGenerationProgressDisplay: ({ statusText }: { statusText: string }) => <span>{statusText}</span> }));
vi.mock('../retry-image', () => ({ RetryImage: () => null }));
vi.mock('tdesign-react', () => ({ MessagePlugin: { success: vi.fn(), error: vi.fn() } }));

const anchor: PlaitImageGenerationAnchor = {
  id: 'anchor', type: 'generation-anchor', points: [[0, 0], [320, 180]], angle: 0,
  anchorType: 'frame', phase: 'failed', title: '图片', transitionMode: 'hold',
  createdAt: 1, workflowId: 'workflow', taskIds: ['task'], primaryTaskId: 'task', zoom: 1,
};
describe('completed image recovery button', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.retryTask.mockReset();
    mocks.tasks = [{ id: 'task', type: TaskType.IMAGE, status: TaskStatus.COMPLETED, params: { workflowId: 'workflow' }, result: { url: 'existing.png' }, createdAt: 1 }];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('sends the existing task to the recovery hook without directly regenerating', () => {
    const listener = vi.fn();
    window.addEventListener(IMAGE_GENERATION_ANCHOR_RETRY_EVENT, listener);
    try {
      render(<ImageGenerationAnchorContent board={{} as PlaitBoard} element={anchor} selected />);
      expect(screen.getByText('图片加载失败')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: '恢复图片' }));
      act(() => vi.runAllTimers());
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toEqual({ taskId: 'task', anchorId: 'anchor' });
      expect(mocks.retryTask).not.toHaveBeenCalled();
    } finally { window.removeEventListener(IMAGE_GENERATION_ANCHOR_RETRY_EVENT, listener); }
  });
});
