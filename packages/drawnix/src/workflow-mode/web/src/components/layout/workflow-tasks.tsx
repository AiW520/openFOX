import { useEffect, useState } from 'react';
import { ExternalLink, LocateFixed, X } from 'lucide-react';
import { taskStorageReader } from '../../../../../services/task-storage-reader';
import type { Task } from '../../../../../types/task.types';
import { getDocumentBatchScope } from '../../services/document-batch-scope';
import { navigateWorkflow } from '../../../../host/workflow-navigation';
import './workflow-tasks.scss';

const statusLabels: Record<string, string> = { pending: '等待中', processing: '生成中', completed: '已完成', failed: '失败', cancelled: '已取消' };

export function WorkflowTasks({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        const read = async () => {
            try {
                const values = await taskStorageReader.getAllTasks({ limit: 200 });
                const scope = getDocumentBatchScope();
                if (active) setTasks(values.filter(task => {
                    const owner = task.params.workflow as { scopeId?: string; projectId?: string } | undefined;
                    return owner ? owner.scopeId === scope && (!projectId || owner.projectId === projectId) : task.params.documentBatch?.scopeId === scope;
                }));
            } catch { if (active) setError('任务读取失败'); }
        };
        void read();
        const timer = window.setInterval(() => void read(), 1500);
        return () => { active = false; window.clearInterval(timer); };
    }, [projectId]);
    return <aside className="workflow-tasks" aria-label="任务" role="dialog" aria-modal="false">
        <header><strong>任务</strong><button type="button" title="关闭任务" aria-label="关闭任务" onClick={onClose}><X size={18} /></button></header>
        <div className="workflow-tasks__list">
            {!tasks.length && <p>{error || '暂无任务'}</p>}
            {tasks.map(task => {
                const owner = task.params.workflow as { projectId?: string; nodeId?: string } | undefined;
                const nativeResult = task.params.nativeResult as { urls?: string[]; text?: string } | undefined;
                const url = task.result?.url || nativeResult?.urls?.[0];
                return <article key={task.id}>
                    <div><span>{statusLabels[task.status] || task.status}</span><time>{new Date(task.createdAt).toLocaleString('zh-CN')}</time></div>
                    <p>{task.params.prompt || String(task.params.model || '生成任务')}</p>
                    {task.error?.message && <p className="workflow-tasks__error">{task.error.message}</p>}
                    {nativeResult?.text && <p>{nativeResult.text.slice(0, 160)}</p>}
                    <footer>
                        {owner?.projectId && <button type="button" onClick={() => {
                            navigateWorkflow(`/workflow/canvas/${owner.projectId}?focus=${encodeURIComponent(owner.nodeId || '')}`);
                            window.dispatchEvent(new CustomEvent('opentu:workflow:focus-node', { detail: owner.nodeId }));
                            onClose();
                        }}><LocateFixed size={14} />定位节点</button>}
                        {url && /^(https?:|data:|blob:|\/)/.test(url) && <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />查看结果</a>}
                    </footer>
                </article>;
            })}
        </div>
    </aside>;
}
