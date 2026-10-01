import { useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  LoaderCircle,
  Music2,
  PanelRight,
  RefreshCw,
  Video,
  XCircle,
} from 'lucide-react';
import { useSharedTaskState } from '../../hooks/useTaskQueue';
import {
  TaskStatus,
  TaskType,
  type Task,
} from '../../types/task.types';
import './new-experience-studio.scss';

export interface NewExperienceStudioProps {
  currentBoardId?: string | null;
  onBackHome: () => void;
  children: React.ReactNode;
}

const TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.IMAGE]: '图片',
  [TaskType.VIDEO]: '视频',
  [TaskType.AUDIO]: '音频',
  [TaskType.CHARACTER]: '角色',
  [TaskType.INSPIRATION_BOARD]: '灵感板',
  [TaskType.CHAT]: '文案',
};

function TaskIcon({ type }: { type: TaskType }) {
  if (type === TaskType.VIDEO) return <Video size={15} />;
  if (type === TaskType.AUDIO) return <Music2 size={15} />;
  return <ImageIcon size={15} />;
}

function statusLabel(task: Task): string {
  switch (task.status) {
    case TaskStatus.PENDING:
      return '排队中';
    case TaskStatus.PROCESSING:
      return task.progress ? `生成中 ${Math.round(task.progress)}%` : '生成中';
    case TaskStatus.COMPLETED:
      return task.insertedToCanvas ? '已完成 · 已入画布' : '已完成';
    case TaskStatus.FAILED:
      return '生成失败';
    case TaskStatus.CANCELLED:
      return '已取消';
    default:
      return task.status;
  }
}

function statusIcon(task: Task) {
  if (task.status === TaskStatus.COMPLETED) {
    return <CheckCircle2 size={14} />;
  }
  if (task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED) {
    return <XCircle size={14} />;
  }
  if (task.status === TaskStatus.PROCESSING) {
    return <LoaderCircle className="new-studio__spin" size={14} />;
  }
  return <Clock3 size={14} />;
}

function taskModel(task: Task): string {
  const modelRef = task.invocationRoute?.modelRef;
  return (
    modelRef?.modelId ||
    task.invocationRoute?.modelId ||
    (typeof task.params.model === 'string' ? task.params.model : '') ||
    '当前模型'
  );
}

function TaskResultPreview({ task }: { task: Task }) {
  const result = task.result;
  if (!result || task.status !== TaskStatus.COMPLETED) return null;

  if (task.type === TaskType.IMAGE && result.url) {
    return (
      <a
        className="new-studio__result-preview"
        href={result.url}
        target="_blank"
        rel="noreferrer"
        title="在新标签页查看原图"
      >
        <img src={result.thumbnailUrl || result.url} alt="生成结果" loading="lazy" />
        <ExternalLink size={13} />
      </a>
    );
  }

  if (task.type === TaskType.VIDEO && result.url) {
    return (
      <a
        className="new-studio__result-preview new-studio__result-preview--video"
        href={result.url}
        target="_blank"
        rel="noreferrer"
        title="打开生成视频"
      >
        {result.thumbnailUrl ? (
          <img src={result.thumbnailUrl} alt="视频封面" loading="lazy" />
        ) : (
          <Video size={20} />
        )}
        <ExternalLink size={13} />
      </a>
    );
  }

  if (task.type === TaskType.AUDIO && result.url) {
    return (
      <div className="new-studio__audio-result">
        <Music2 size={16} />
        <audio controls preload="none" src={result.url} />
      </div>
    );
  }

  return null;
}

function TaskCard({ task }: { task: Task }) {
  const prompt = task.params.prompt || task.params.title || '未命名请求';
  const createdAt = new Date(task.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const statusClass = task.status.replace('_', '-');

  return (
    <article className={`new-studio__task new-studio__task--${statusClass}`}>
      <div className="new-studio__task-heading">
        <span className="new-studio__task-type">
          <TaskIcon type={task.type} />
          {TYPE_LABELS[task.type] || task.type}
        </span>
        <time dateTime={new Date(task.createdAt).toISOString()}>{createdAt}</time>
      </div>
      <p className="new-studio__task-prompt">{prompt}</p>
      <div className="new-studio__task-meta">
        <span className="new-studio__task-status">
          {statusIcon(task)} {statusLabel(task)}
        </span>
        <span className="new-studio__task-model" title={taskModel(task)}>
          {taskModel(task)}
        </span>
      </div>
      {task.status === TaskStatus.PROCESSING && task.progress !== undefined ? (
        <div className="new-studio__progress" aria-label={`生成进度 ${task.progress}%`}>
          <span style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
        </div>
      ) : null}
      {task.error?.message ? (
        <p className="new-studio__task-error">{task.error.message}</p>
      ) : null}
      <TaskResultPreview task={task} />
    </article>
  );
}

export function NewExperienceStudio({
  currentBoardId,
  onBackHome,
  children,
}: NewExperienceStudioProps) {
  const { tasks, isLoading } = useSharedTaskState();
  const visibleTasks = useMemo(() => tasks.slice(0, 12), [tasks]);
  const activeCount = tasks.filter(
    (task) => task.status === TaskStatus.PENDING || task.status === TaskStatus.PROCESSING
  ).length;
  const completedCount = tasks.filter(
    (task) => task.status === TaskStatus.COMPLETED
  ).length;

  return (
    <main className="new-studio">
      <header className="new-studio__header">
        <div className="new-studio__header-left">
          <button
            type="button"
            className="new-studio__back"
            onClick={onBackHome}
            title="返回灵感台"
            aria-label="返回灵感台"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="new-studio__title-row">
              <span className="new-studio__mark">O</span>
              <strong>新版本创作工作台</strong>
            </div>
            <span className="new-studio__subtitle">
              {currentBoardId ? '当前画布已同步' : '本地画布'} · 生成结果会回到这里
            </span>
          </div>
        </div>
        <div className="new-studio__header-stats">
          <span><LoaderCircle size={14} /> {activeCount} 个进行中</span>
          <span><CheckCircle2 size={14} /> {completedCount} 个已完成</span>
          <PanelRight size={17} aria-hidden="true" />
        </div>
      </header>

      <section className="new-studio__body">
        <div className="new-studio__canvas" aria-label="新版本创作画布">
          {children}
        </div>
        <aside className="new-studio__panel" aria-label="请求与结果">
          <div className="new-studio__panel-heading">
            <div>
              <span className="new-studio__panel-kicker">LIVE WORKFLOW</span>
              <h2>请求与结果</h2>
            </div>
            <span className="new-studio__panel-count">{tasks.length}</span>
          </div>
          <p className="new-studio__panel-note">
            从画布输入栏发送请求，状态和结果会在这里持续更新。
          </p>
          <div className="new-studio__legend">
            <span><i className="is-active" />进行中</span>
            <span><i className="is-done" />已回到画布</span>
          </div>
          <div className="new-studio__task-list">
            {isLoading ? (
              <div className="new-studio__empty"><LoaderCircle className="new-studio__spin" size={19} />正在同步任务…</div>
            ) : visibleTasks.length === 0 ? (
              <div className="new-studio__empty">
                <RefreshCw size={20} />
                <strong>还没有请求</strong>
                <span>在画布输入提示词，开始第一次创作。</span>
              </div>
            ) : (
              visibleTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default NewExperienceStudio;
