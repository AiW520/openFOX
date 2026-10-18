import localforage from 'localforage';

export type EnhancementScale = 2 | 4;
export type EnhancementModel = 'RealESRGAN_x4plus' | 'RealESRGAN_x4plus_anime_6B';
export type EnhancementTask = {
  id?: string;
  status: string;
  progress?: number;
  width?: number;
  height?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  queuePosition?: number;
  resultUrl?: string;
  error?: string;
  scale?: EnhancementScale;
  model?: EnhancementModel;
};
export type EnhancementRef = { requestId: string; scale: EnhancementScale; model: EnhancementModel };
export const PHOTO_MODEL: EnhancementModel = 'RealESRGAN_x4plus';
export const ANIME_MODEL: EnhancementModel = 'RealESRGAN_x4plus_anime_6B';
const API = '/api/publisher/enhancement';
const records = localforage.createInstance({ name: 'opentu-enhancement', storeName: 'tasks' });
const results = localforage.createInstance({ name: 'opentu-enhancement', storeName: 'results' });
type Record = EnhancementRef & { task: EnhancementTask; source?: Blob };
const active = new Map<string, Promise<void>>();
const cancellations = new Set<string>();
const listeners = new Set<() => void>();
let revision = 0;
const snapshots = new Map<string, EnhancementTask>();
const notify = () => { revision++; listeners.forEach(listener => listener()); };
export const subscribeEnhancement = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const enhancementRevision = () => revision;
export const enhancementSnapshot = (requestId?: string) => requestId ? snapshots.get(requestId) : undefined;
export const isEnhancementTerminal = (status?: string) => ['completed', 'failed', 'cancelled'].includes(status || '');
export const enhancementResult = (requestId: string) => results.getItem<Blob>(requestId);
export const enhancementOriginal = async (requestId: string) => (await records.getItem<Record>(requestId))?.source;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const signal = init?.signal || AbortSignal.timeout(90_000);
  const response = await fetch(API + path, { ...init, credentials: 'same-origin', signal });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '超分请求失败，原图已保留');
  }
  return response.json();
}

let configuration: Promise<{ enabled: boolean; automatic: boolean }> | undefined;
export function enhancementConfig() {
  if (!configuration) {
    configuration = request<{ enabled: boolean; automatic: boolean }>('/config').catch(() => {
      configuration = undefined;
      return { enabled: false, automatic: false };
    });
  }
  return configuration;
}

async function save(record: Record) {
  await records.setItem(record.requestId, record);
  snapshots.set(record.requestId, record.task); notify();
}

async function storeResult(requestId: string, task: EnhancementTask) {
  if (task.status !== 'completed' || await results.getItem(requestId)) return;
  if (!task.resultUrl) throw new Error('高清结果地址缺失，原图已保留');
  const response = await fetch(task.resultUrl, { credentials: 'same-origin', signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error('高清结果下载失败，原图已保留');
  await results.setItem(requestId, await response.blob());
}

/** One tracker per persistent request; navigation never restarts source generation. */
export function trackEnhancement(ref: EnhancementRef, getSource: () => Promise<Blob>) {
  if (active.has(ref.requestId)) return active.get(ref.requestId)!;
  const run = (async () => {
    let record = await records.getItem<Record>(ref.requestId);
    try {
      if (!record) {
        const source = await getSource();
        if (cancellations.has(ref.requestId)) return;
        record = { ...ref, task: { status: 'uploading', progress: 0 }, source };
        await save(record);
      }
      if (isEnhancementTerminal(record.task.status)) {
        await storeResult(ref.requestId, record.task);
        snapshots.set(ref.requestId, record.task); notify(); return;
      }
      snapshots.set(ref.requestId, record.task); notify();
      if (!record.task.id) {
        if (cancellations.has(ref.requestId)) return;
        const submitted = await request<EnhancementTask>(`?scale=${ref.scale}&model=${ref.model}`, {
          method: 'POST', body: record.source, headers: { 'Idempotency-Key': ref.requestId, 'Content-Type': record.source?.type || 'application/octet-stream' },
        });
        record.task = submitted;
        if (cancellations.has(ref.requestId)) record.task = await request<EnhancementTask>(`/${submitted.id}/cancel`, { method: 'POST' });
        await storeResult(ref.requestId, record.task);
        await save(record);
      }
      while (!isEnhancementTerminal(record.task.status)) {
        await new Promise(resolve => window.setTimeout(resolve, 5000));
        // A cancel can update the durable record while a poll is waiting.
        const current = await records.getItem<Record>(ref.requestId);
        if (current && isEnhancementTerminal(current.task.status)) { record = current; break; }
        try {
          const task = await request<EnhancementTask>(`/${record.task.id}`);
          await storeResult(ref.requestId, task);
          const latest = await records.getItem<Record>(ref.requestId);
          if (latest && (isEnhancementTerminal(latest.task.status) || cancellations.has(ref.requestId))) {
            record = latest;
            break;
          }
          record.task = task; await save(record);
        } catch (error) {
          record.task.error = error instanceof Error ? error.message : '超分连接暂时中断';
          await save(record);
          // Wait for an explicit resume after a network/auth failure; never spin indefinitely.
          return;
        }
      }
    } catch (error) {
      const task = { ...record?.task, status: record?.task.id ? record.task.status : 'failed', error: error instanceof Error ? error.message : '超分失败，原图已保留' };
      if (task.status === 'completed') task.status = 'encoding';
      await save({ ...record, ...ref, task });
    }
  })().finally(() => active.delete(ref.requestId));
  active.set(ref.requestId, run); return run;
}

export async function cancelEnhancement(ref: EnhancementRef) {
  cancellations.add(ref.requestId);
  const record = await records.getItem<Record>(ref.requestId);
  if (!record) {
    await save({ ...ref, task: { status: 'cancelled' } });
    return;
  }
  if (record.task.id) {
    try { record.task = await request<EnhancementTask>(`/${record.task.id}/cancel`, { method: 'POST' }); }
    catch (error) { cancellations.delete(ref.requestId); throw error; }
  }
  else record.task = { ...record.task, status: 'cancelled' };
  await save(record);
}

export function resumeEnhancement(ref: EnhancementRef) {
  return trackEnhancement(ref, async () => { throw new Error('原图未保存，请重新开始超分'); });
}

export function newEnhancement(scale: EnhancementScale = 4, model: EnhancementModel = PHOTO_MODEL): EnhancementRef {
  return { requestId: crypto.randomUUID(), scale, model };
}

export async function fetchEnhancementSource(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('无法读取原图，请先下载后重新上传');
  return response.blob();
}
