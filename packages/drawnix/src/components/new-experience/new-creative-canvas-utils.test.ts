import { describe, expect, it } from 'vitest';
import { TaskType } from '../../types/task.types';
import {
  NEW_CANVAS_STORAGE_PREFIX,
  loadExcalidrawScene,
  persistenceKeyForBoard,
  saveExcalidrawScene,
  taskTypeForGeneration,
} from './new-creative-canvas-utils';

describe('new creative canvas helpers', () => {
  it.each([
    ['image', TaskType.IMAGE],
    ['video', TaskType.VIDEO],
    ['audio', TaskType.AUDIO],
    ['text', TaskType.CHAT],
    ['agent', TaskType.CHAT],
  ] as const)('maps %s generation to the shared task type', (generation, taskType) => {
    expect(taskTypeForGeneration(generation)).toBe(taskType);
  });

  it('keeps Excalidraw persistence isolated by board and local fallback', () => {
    expect(persistenceKeyForBoard('board-42')).toBe(`${NEW_CANVAS_STORAGE_PREFIX}board-42`);
    expect(persistenceKeyForBoard(null)).toBe(`${NEW_CANVAS_STORAGE_PREFIX}local`);
    expect(persistenceKeyForBoard('')).toBe(`${NEW_CANVAS_STORAGE_PREFIX}local`);
  });

  it('loads and saves a board-scoped Excalidraw snapshot', () => {
    const key = persistenceKeyForBoard('board-42');
    const snapshot = { elements: [] } as const;
    saveExcalidrawScene(key, snapshot);
    expect(loadExcalidrawScene(key)?.elements).toEqual([]);
  });

  it('restores collaborators as a Map when loading legacy JSON state', () => {
    const key = persistenceKeyForBoard('board-with-legacy-state');
    localStorage.setItem(
      key,
      JSON.stringify({ elements: [], appState: { collaborators: {} } })
    );

    const loaded = loadExcalidrawScene(key);

    expect(loaded?.appState?.collaborators).toBeInstanceOf(Map);
  });

  it('does not persist ephemeral collaborators connection state', () => {
    const key = persistenceKeyForBoard('board-with-collaborators');
    saveExcalidrawScene(key, {
      elements: [],
      appState: {
        collaborators: new Map(),
      } as never,
    });

    const persisted = JSON.parse(localStorage.getItem(key) || '{}');

    expect(persisted.appState).not.toHaveProperty('collaborators');
  });
});
