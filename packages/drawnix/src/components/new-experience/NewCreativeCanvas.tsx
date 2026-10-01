import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, Plus, Send } from 'lucide-react';
import {
  Excalidraw,
  convertToExcalidrawElements,
} from '@excalidraw/excalidraw';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types';
import '@excalidraw/excalidraw/index.css';
import { useChatDrawerGenerationControls } from '../chat-drawer/useChatDrawerGenerationControls';
import { ModelDropdown } from '../ai-input-bar/ModelDropdown';
import { ParametersDropdown } from '../ai-input-bar/ParametersDropdown';
import { useSharedTaskState, useTaskActions } from '../../hooks/useTaskQueue';
import { TaskStatus, TaskType, type Task } from '../../types/task.types';
import { registerAIInputPrefillConsumer } from '../../services/ai-input-ui-events';
import {
  loadExcalidrawScene,
  persistenceKeyForBoard,
  saveExcalidrawScene,
  taskTypeForGeneration,
} from './new-creative-canvas-utils';
import './new-creative-canvas.scss';

const SEED_ELEMENTS = convertToExcalidrawElements([
  { type: 'text', x: 120, y: 90, text: '从一个想法开始', fontSize: 30, strokeColor: '#1f261d' },
  { type: 'text', x: 122, y: 140, text: '把提示词、素材和生成结果放在同一张无限画布上。', fontSize: 16, strokeColor: '#687260' },
  { type: 'rectangle', x: 120, y: 230, width: 350, height: 170, backgroundColor: '#f0f6dc', strokeColor: '#809447', fillStyle: 'solid', strokeWidth: 2, customData: { opentu: { kind: 'starter', type: 'prompt' } } },
  { type: 'text', x: 148, y: 265, text: '提示词节点\n\n在下方输入框提交创作请求，结果会回到画布。', fontSize: 18, strokeColor: '#33401f' },
  { type: 'rectangle', x: 540, y: 230, width: 350, height: 170, backgroundColor: '#f8eee1', strokeColor: '#bd8b52', fillStyle: 'solid', strokeWidth: 2, customData: { opentu: { kind: 'starter', type: 'result' } } },
  { type: 'text', x: 568, y: 265, text: '结果节点\n\n图片、视频、音频和文案会按任务回写到这里。', fontSize: 18, strokeColor: '#5b4329' },
], { regenerateIds: true });

type TaskElementData = {
  taskId: string;
  kind: 'task';
  taskType: TaskType;
  status: TaskStatus;
  resultUrl?: string;
};

function taskTitle(type: TaskType): string {
  if (type === TaskType.IMAGE) return '图片结果';
  if (type === TaskType.VIDEO) return '视频结果';
  if (type === TaskType.AUDIO) return '音频结果';
  return '文案结果';
}

function taskStatusLabel(status: TaskStatus, error?: string): string {
  if (status === TaskStatus.COMPLETED) return '已完成';
  if (status === TaskStatus.FAILED) return error || '生成失败';
  return '处理中';
}

function taskColor(type: TaskType): { backgroundColor: string; strokeColor: string } {
  if (type === TaskType.IMAGE) return { backgroundColor: '#e9f3ff', strokeColor: '#6b96c8' };
  if (type === TaskType.VIDEO) return { backgroundColor: '#f0eaff', strokeColor: '#9278c6' };
  if (type === TaskType.AUDIO) return { backgroundColor: '#fff0e5', strokeColor: '#c58a5f' };
  return { backgroundColor: '#edf5e4', strokeColor: '#7da060' };
}

function createTaskElements(task: Task, x: number, y: number) {
  const resultUrl = task.result?.url;
  const data: TaskElementData = { taskId: task.id, kind: 'task', taskType: task.type, status: task.status, resultUrl };
  const colors = taskColor(task.type);
  const title = taskTitle(task.type);
  const status = taskStatusLabel(task.status, task.error?.message);
  const prompt = task.params.prompt || task.params.title || '未命名请求';
  const resultText = task.result?.chatResponse;
  return convertToExcalidrawElements([
    { type: 'rectangle', x, y, width: 360, height: 190, ...colors, fillStyle: 'solid', strokeWidth: 2, link: resultUrl || undefined, customData: { opentu: data } },
    { type: 'text', x: x + 26, y: y + 24, text: `${title}\n\n${status}\n\n${prompt}${resultText ? `\n\n${resultText.slice(0, 180)}` : ''}${resultUrl ? '\n\n打开生成结果 ↗' : ''}`, fontSize: 18, strokeColor: '#252c22', link: resultUrl || undefined, customData: { opentu: data } },
  ], { regenerateIds: true });
}

export interface NewCreativeCanvasProps {
  currentBoardId?: string | null;
}

export function NewCreativeCanvas(props: NewCreativeCanvasProps) {
  return <BoardCanvas key={persistenceKeyForBoard(props.currentBoardId)} {...props} />;
}

function BoardCanvas({ currentBoardId }: NewCreativeCanvasProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const controls = useChatDrawerGenerationControls();
  const { createTask } = useTaskActions();
  const { tasks } = useSharedTaskState();
  const [prompt, setPrompt] = useState('');
  const [notice, setNotice] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const seenTaskIds = useRef(new Set<string>());
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistenceKey = persistenceKeyForBoard(currentBoardId);

  const initialData = useCallback((): ExcalidrawInitialDataState => {
    const saved = loadExcalidrawScene(persistenceKey);
    if (saved) return saved;
    return { elements: SEED_ELEMENTS, appState: { viewBackgroundColor: '#f7f8f4' }, files: {} };
  }, [persistenceKey]);

  const persistScene = useCallback((elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      saveExcalidrawScene(persistenceKey, { elements, appState, files });
      persistTimer.current = null;
    }, 120);
  }, [persistenceKey]);

  useEffect(() => () => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
  }, [persistenceKey]);

  const insertTaskNode = useCallback((task: Task): boolean => {
    const api = apiRef.current;
    if (!api) return false;
    const existing = api.getSceneElements();
    if (existing.some((element) => (element.customData as { opentu?: { taskId?: string } } | undefined)?.opentu?.taskId === task.id)) return true;
    const offset = existing.length * 18;
    const nextElements = createTaskElements(task, 160 + (offset % 620), 500 + (offset % 220));
    api.updateScene({ elements: [...existing, ...nextElements] });
    return true;
  }, []);

  useEffect(() => {
    tasks.forEach((task) => {
      if (task.params.excalidrawSceneKey !== persistenceKey) return;
      if (seenTaskIds.current.has(task.id)) return;
      if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
        if (insertTaskNode(task)) seenTaskIds.current.add(task.id);
      }
    });
  }, [insertTaskNode, isEditorReady, tasks, persistenceKey]);

  useEffect(() => registerAIInputPrefillConsumer((detail) => {
    setPrompt(detail.prompt);
    if (detail.generationType) controls.setGenerationType(detail.generationType);
    if (detail.model) controls.handleModelSelect(detail.model, detail.modelRef || null);
    setNotice('已从灵感台带入提示词');
  }), [controls]);

  const handleSend = () => {
    const value = prompt.trim();
    if (!value || isSending) return;
    setIsSending(true);
    try {
      const type = taskTypeForGeneration(controls.generationType);
      const task = createTask({ ...controls.selectedParams, prompt: value, model: controls.selectedModel, modelRef: controls.selectedModelRef, generationType: controls.generationType, count: controls.selectedCount, excalidrawSceneKey: persistenceKey, autoInsertToCanvas: false }, type);
      if (!task) throw new Error('请求未能加入队列，请检查模型配置后重试');
      setPrompt('');
      setNotice('请求已加入任务队列');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '请求提交失败');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="new-creative-canvas">
      <div className="new-creative-canvas__stage">
        <Excalidraw
          langCode="zh-CN"
          initialData={initialData}
          excalidrawAPI={(api) => { apiRef.current = api; setIsEditorReady(true); }}
          onChange={(elements, appState, files) => persistScene(elements, appState, files)}
          UIOptions={{ canvasActions: { export: {}, saveToActiveFile: false, loadScene: false } }}
          name="OpenTu 创作画布"
        />
      </div>
      <div className="new-creative-canvas__composer" aria-label="新版创作输入">
        <div className="new-creative-canvas__composer-tools">
          <button type="button" className="new-creative-canvas__add" title="添加提示词节点" onClick={() => {
            const api = apiRef.current;
            if (!api) return;
            const next = convertToExcalidrawElements([{ type: 'text', x: 180, y: 470, text: '新的提示词节点', fontSize: 18, strokeColor: '#33401f', customData: { opentu: { kind: 'prompt' } } }], { regenerateIds: true });
            api.updateScene({ elements: [...api.getSceneElements(), ...next] });
          }}><Plus size={15} /></button>
          <ModelDropdown models={controls.currentModels} selectedModel={controls.selectedModel} selectedSelectionKey={controls.selectedSelectionKey} onSelect={controls.handleModelSelect} onSelectModel={controls.handleModelConfigSelect} />
          {controls.compatibleParams.length > 0 ? <ParametersDropdown modelId={controls.selectedModel} compatibleParams={controls.compatibleParams} selectedParams={controls.selectedParams} onParamChange={controls.handleParamSelect} /> : null}
        </div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) handleSend(); }} placeholder="在画布里描述下一步创作…" rows={2} />
        <button type="button" className="new-creative-canvas__send" onClick={handleSend} disabled={!prompt.trim() || isSending} title="发送请求">{isSending ? <LoaderCircle className="new-creative-canvas__spin" size={17} /> : <Send size={17} />}</button>
        {notice ? <span className="new-creative-canvas__notice"><Check size={13} />{notice}</span> : null}
      </div>
    </div>
  );
}

export default NewCreativeCanvas;
