import type { GenerationType } from '../../utils/ai-input-parser';
import { TaskType } from '../../types/task.types';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/dist/types/excalidraw/types';

export const NEW_CANVAS_STORAGE_PREFIX = 'opentu-excalidraw-v1:';

export function taskTypeForGeneration(type: GenerationType): TaskType {
  if (type === 'image') return TaskType.IMAGE;
  if (type === 'video') return TaskType.VIDEO;
  if (type === 'audio') return TaskType.AUDIO;
  return TaskType.CHAT;
}

export function persistenceKeyForBoard(boardId?: string | null): string {
  return `${NEW_CANVAS_STORAGE_PREFIX}${boardId || 'local'}`;
}

export interface ExcalidrawSceneSnapshot {
  elements: NonNullable<ExcalidrawInitialDataState['elements']>;
  appState?: ExcalidrawInitialDataState['appState'];
  files?: BinaryFiles;
}

/**
 * `collaborators` is a runtime Map in Excalidraw's app state. It cannot be
 * represented by JSON, so persisted scenes need to restore it before being
 * passed back to Excalidraw.
 */
function normalizeAppState(
  appState: ExcalidrawInitialDataState['appState'] | undefined
): ExcalidrawInitialDataState['appState'] | undefined {
  if (!appState || typeof appState !== 'object') return appState;

  const state = appState as Partial<AppState> & { collaborators?: unknown };
  if (state.collaborators instanceof Map) return appState;

  return {
    ...state,
    collaborators: new Map(),
  } as ExcalidrawInitialDataState['appState'];
}

export function loadExcalidrawScene(
  storageKey: string
): ExcalidrawSceneSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExcalidrawSceneSnapshot>;
    if (!Array.isArray(parsed.elements)) return null;
    return {
      elements: parsed.elements as NonNullable<ExcalidrawInitialDataState['elements']>,
      appState: normalizeAppState(parsed.appState),
      files: parsed.files || {},
    };
  } catch {
    return null;
  }
}

export function saveExcalidrawScene(
  storageKey: string,
  snapshot: ExcalidrawSceneSnapshot
): void {
  try {
    // `collaborators` is ephemeral connection state and must not be serialized
    // as a plain object, which would crash Excalidraw on the next load.
    const appState = snapshot.appState
      ? { ...snapshot.appState, collaborators: undefined }
      : snapshot.appState;
    localStorage.setItem(storageKey, JSON.stringify({ ...snapshot, appState }));
  } catch {
    // Storage can be unavailable or full; the in-memory canvas remains usable.
  }
}
