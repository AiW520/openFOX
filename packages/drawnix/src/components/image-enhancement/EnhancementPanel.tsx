import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button, Modal, Progress, Radio, Select } from 'antd';
import { Download, Sparkles, X, RotateCw } from 'lucide-react';
import { Z_INDEX } from '../../constants/z-index';
import { ANIME_MODEL, PHOTO_MODEL, cancelEnhancement, enhancementConfig, enhancementRevision, enhancementSnapshot,
  isEnhancementTerminal, resumeEnhancement, subscribeEnhancement, type EnhancementModel, type EnhancementRef, type EnhancementScale } from '../../services/image-enhancement';

const labels: Record<string, string> = { uploading: '正在上传原图', submitting: '正在提交', queued: '等待超分', loading_model: '正在加载模型',
  processing: '正在超分', merging: '正在合并图像', encoding: '正在保存高清图', completed: '超分完成', failed: '超分失败', cancelled: '已取消' };

export function EnhancementPanel({ open, onClose, enhancement, onStart, originalUrl, resultUrl, width, height }: {
  open: boolean; onClose: () => void; enhancement?: EnhancementRef & { applied?: boolean }; onStart: (scale: EnhancementScale, model: EnhancementModel) => void;
  originalUrl?: string; resultUrl?: string; width?: number; height?: number;
}) {
  const [scale, setScale] = useState<EnhancementScale>(4);
  const [model, setModel] = useState<EnhancementModel>(PHOTO_MODEL);
  const [enabled, setEnabled] = useState<boolean>();
  const [actionError, setActionError] = useState<string>();
  const run = (operation: Promise<unknown>) => { setActionError(undefined); void operation.catch(error => setActionError(error instanceof Error ? error.message : '操作失败，请重试')); };
  useEffect(() => { if (enhancement) { setScale(enhancement.scale); setModel(enhancement.model); } }, [enhancement?.requestId]);
  useEffect(() => { void enhancementConfig().then(config => setEnabled(config.enabled)); }, []);
  useSyncExternalStore(subscribeEnhancement, enhancementRevision);
  const task = enhancementSnapshot(enhancement?.requestId) || (enhancement?.applied ? { status: 'completed', progress: 100 } : undefined);
  const working = !!enhancement && !isEnhancementTerminal(task?.status);
  return <Modal title="AI 超分" open={open} onCancel={onClose} footer={null} width={420} zIndex={Z_INDEX.DIALOG}>
    <div style={{ display: 'grid', gap: 16 }}>
      {width && height ? <div>原图 {width} × {height} → {width * scale} × {height * scale}</div> : null}
      <Radio.Group optionType="button" buttonStyle="solid" value={scale} disabled={working} onChange={event => setScale(event.target.value)}
        options={[{ label: '2×', value: 2 }, { label: '4×', value: 4 }]} />
      <Select aria-label="超分模型" value={model} disabled={working} onChange={setModel} options={[
        { label: '照片 · Real-ESRGAN', value: PHOTO_MODEL }, { label: '动漫插画 · Real-ESRGAN', value: ANIME_MODEL }]} />
      {enabled === false ? <div role="status">尚未配置独立超分服务</div> : null}
      {actionError ? <div role="alert">{actionError}</div> : null}
      {task ? <div aria-live="polite">
        <div>{labels[task.status] || task.status}{task.queuePosition ? ` · 排队 ${task.queuePosition}` : ''}</div>
        <Progress percent={Math.round(task.progress || 0)} status={task.status === 'failed' ? 'exception' : undefined} />
        {task.width && task.height && task.status === 'completed' ? <div>高清图 {task.width} × {task.height}</div> : null}
        {task.error ? <div role="alert">{task.error}</div> : null}
      </div> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {working && task?.error ? <Button icon={<RotateCw size={16} />} onClick={() => enhancement && run(resumeEnhancement(enhancement))}>重新连接</Button> : null}
        {working ? <Button icon={<X size={16} />} onClick={() => enhancement && run(cancelEnhancement(enhancement))}>取消超分</Button>
          : <Button type="primary" disabled={!enabled} icon={task?.status === 'failed' ? <RotateCw size={16} /> : <Sparkles size={16} />}
              onClick={() => onStart(scale, model)}>{task?.status === 'failed' ? '重试超分' : '开始超分'}</Button>}
        {originalUrl ? <Button href={originalUrl} download="opentu-original.png" icon={<Download size={16} />}>原图</Button> : null}
        {resultUrl ? <Button href={resultUrl} download="opentu-hd.png" icon={<Download size={16} />}>高清图</Button> : null}
      </div>
    </div>
  </Modal>;
}
