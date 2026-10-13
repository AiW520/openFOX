import { generateNative } from './native-generation';
import { isGenerationRequest, type GenerationRequest, type GenerationResult } from '../shared/generation-bridge';
import { safeTextError } from '../../services/media-executor/text-response';

const pendingRequests = new Set<() => void>();

export function cancelNativeRequests() {
  for (const abort of pendingRequests) abort();
}

/** In-process replacement for the iframe's validated, cancellable request bridge. */
export async function executeNative(request: GenerationRequest, signal?: AbortSignal, taskId?: string): Promise<GenerationResult> {
  if (!isGenerationRequest(request)) throw new Error('生成参数无效。');
  signal?.throwIfAborted();
  const controller = new AbortController();
  let rejectAbort: (reason: Error) => void = () => undefined;
  const cancelled = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const abort = () => {
    controller.abort();
    rejectAbort(new DOMException('Aborted', 'AbortError'));
  };
  pendingRequests.add(abort);
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (taskId) {
      const { prepareNativeTask, runNativeTask } = await import("./native-task-recovery");
      await prepareNativeTask(taskId, request);
      return await Promise.race([runNativeTask(taskId, controller.signal), cancelled]);
    }
    return await Promise.race([generateNative(request, controller.signal), cancelled]);
  } catch (error) {
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const fallback = 'OpenTu 生成失败，请检查渠道模型绑定、额度和请求参数。';
    let message = fallback;
    try {
      const { settingsManager } = await import('../../utils/settings-manager');
      const settings = settingsManager.getSettings();
      const secrets = [settings.gemini.apiKey, ...settings.providerProfiles.flatMap((profile) => [
        profile.apiKey, ...Object.values(profile.extraHeaders || {}),
      ])];
      message = safeTextError(error, secrets).message;
    } catch {
      // Keep the generic message when credentials cannot be read for redaction.
    }
    if (typeof window !== 'undefined' && message.includes('当前渠道未配置 API Key')) {
      window.dispatchEvent(new CustomEvent('publisher-credentials-required'));
    }
    throw new Error(request.capability === 'text' || message === fallback ? message : `OpenTu 生成失败：${message}`);
  } finally {
    pendingRequests.delete(abort);
    signal?.removeEventListener('abort', abort);
  }
}
