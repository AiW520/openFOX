import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, renameSync, writeFileSync, unlinkSync, createWriteStream, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const PREFIX = '/api/publisher/enhancement';
const MODELS = ['RealESRGAN_x4plus', 'RealESRGAN_x4plus_anime_6B'];
const UPLOAD_LIMIT = 50 * 1024 * 1024;
const RESULT_LIMIT = 128 * 1024 * 1024;
const ACTIVE = new Set(['submitting', 'queued', 'loading_model', 'processing', 'merging', 'encoding']);
const hash = value => createHash('sha256').update(value).digest('hex');

export function createEnhancement({ dataDir, serviceUrl, token, fetchService = fetch, authorize, checkMutation, readBody, json, requireCondition, limits }) {
  let base;
  if (serviceUrl && token) {
    base = new URL(serviceUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
      throw new Error('PUBLISHER_UPSCALER_URL must be an internal HTTP(S) origin');
    }
  }
  const dir = join(dataDir, 'enhancement');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const manifest = join(dir, 'jobs.json');
  const jobs = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : {};
  const running = new Map();
  const shutdown = new AbortController();
  const save = () => {
    if (shutdown.signal.aborted) return;
    writeFileSync(manifest + '.tmp', JSON.stringify(jobs), { mode: 0o600 });
    renameSync(manifest + '.tmp', manifest);
  };
  const remove = path => { if (existsSync(path)) unlinkSync(path); };
  const view = job => ({ id: job.id, status: job.status, progress: job.progress || 0,
    stage: job.stage, width: job.width, height: job.height, sourceWidth: job.sourceWidth,
    sourceHeight: job.sourceHeight, queuePosition: job.queuePosition, error: job.error,
    model: job.model, scale: job.scale,
    resultUrl: job.status === 'completed' ? `${PREFIX}/${job.id}/result` : undefined });

  async function remote(path, init = {}) {
    let response;
    try {
      response = await fetchService(new URL(path, base), { ...init, redirect: 'error',
        signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(90_000)]), headers: { ...init.headers, Authorization: `Bearer ${token}` } });
    } catch { requireCondition(false, 502, '超分服务暂时无法连接，原图已保留'); }
    if (!response.ok) {
      await response.body?.cancel();
      requireCondition(false, [400, 404, 409, 410, 413, 429].includes(response.status) ? response.status : 502,
        response.status === 429 ? '超分队列已满，原图已保留，请稍后重试' : '超分服务请求失败，原图已保留');
    }
    return response;
  }

  async function persistResult(job) {
    const response = await remote(`/api/upscale/${job.remoteId}/download`);
    const temp = join(dir, `${job.id}.png.tmp`);
    let size = 0;
    const header = [];
    let headerBytes = 0;
    const bounded = new Transform({ transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > RESULT_LIMIT) return callback(new Error('Result too large'));
      if (headerBytes < 24) { header.push(chunk.subarray(0, 24 - headerBytes)); headerBytes += Math.min(chunk.length, 24 - headerBytes); }
      callback(null, chunk);
    } });
    try {
      requireCondition(response.body && Number(response.headers.get('content-length') || 0) <= RESULT_LIMIT, 502, '超分结果过大');
      await pipeline(Readable.fromWeb(response.body), bounded, createWriteStream(temp, { mode: 0o600 }), { signal: shutdown.signal });
      const bytes = Buffer.concat(header);
      requireCondition(bytes.length === 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        bytes.toString('ascii', 12, 16) === 'IHDR', 502, '超分结果不是有效 PNG');
      const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
      requireCondition(width > 0 && height > 0 && width === job.width && height === job.height, 502, '超分结果尺寸不匹配');
      renameSync(temp, join(dir, `${job.id}.png`));
      job.status = 'completed'; job.progress = 100;
    } finally { remove(temp); }
  }

  async function advance(job) {
    if (!base || shutdown.signal.aborted || !ACTIVE.has(job.status)) return;
    if (running.has(job.id)) return running.get(job.id);
    const promise = (async () => {
      try {
        requireCondition(Date.now() - job.createdAt < 24 * 60 * 60_000, 410, '超分任务已过期');
        if (!job.remoteId) {
          const form = new FormData();
          form.append('file', new Blob([readFileSync(join(dir, `${job.id}.source`))]), 'source.png');
          for (const [key, value] of Object.entries({ processing_mode: 'upscale', scale: job.scale,
            resolution: 'scale', model: job.model, output_format: 'png', face_enhance: false })) form.append(key, String(value));
          const created = await (await remote('/api/upscale', { method: 'POST', body: form,
            headers: { 'Idempotency-Key': `opentu:${job.id}` } })).json();
          requireCondition(typeof created.job_id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(created.job_id), 502, '超分任务标识无效');
          job.remoteId = created.job_id; job.status = 'queued'; save();
          remove(join(dir, `${job.id}.source`));
        }
        const status = await (await remote(`/api/upscale/${job.remoteId}/status`)).json();
        if (job.status === 'cancelled') return;
        job.sourceWidth = Number(status.input_width) || undefined;
        job.sourceHeight = Number(status.input_height) || undefined;
        job.width = Number(status.output_width) || undefined;
        job.height = Number(status.output_height) || undefined;
        job.progress = Math.min(99, Math.max(0, Number(status.progress) || 0));
        job.error = undefined;
        job.queuePosition = Number(status.queue_position) || undefined;
        // Only known stages and generic failures cross the service boundary.
        job.stage = ACTIVE.has(status.status) ? status.status : undefined;
        if (status.status === 'completed') await persistResult(job);
        else if (status.status === 'failed' || status.status === 'cancelled') {
          job.status = status.status;
          job.error = status.status === 'failed' ? '超分处理失败，原图已保留，可重试超分' : undefined;
        } else requireCondition(ACTIVE.has(status.status), 502, '超分状态无效');
        if (ACTIVE.has(status.status)) job.status = status.status;
        job.updatedAt = Date.now(); save();
      } catch (error) {
        if (shutdown.signal.aborted) return;
        // A transport failure is recoverable; the remote idempotency key survives restart.
        job.error = error.status === 429 ? '超分队列已满，原图已保留，请稍后重试' : '正在尝试重新连接超分服务，原图已保留';
        if ([400, 404, 409, 410, 413, 429].includes(error.status)) {
          job.status = 'failed'; job.error = error.status === 429 ? job.error : '超分图片或参数不受支持，原图已保留，请检查尺寸后重试';
          remove(join(dir, `${job.id}.source`));
        }
        save();
      }
    })().finally(() => running.delete(job.id));
    running.set(job.id, promise);
    return promise;
  }

  async function handle(req, res, url) {
    if (!url.pathname.startsWith(PREFIX)) return false;
    if (url.pathname === `${PREFIX}/config` && req.method === 'GET') {
      json(res, 200, { enabled: Boolean(base), automatic: Boolean(base), scales: [2, 4], models: MODELS }); return true;
    }
    const visitor = authorize(req);
    requireCondition(base, 503, '尚未配置独立超分服务，原图可以正常使用');
    if (req.method === 'POST') checkMutation(req);
    if (url.pathname === PREFIX && req.method === 'POST') {
      const requestId = req.headers['idempotency-key'];
      const scale = Number(url.searchParams.get('scale'));
      const model = url.searchParams.get('model');
      requireCondition(typeof requestId === 'string' && /^[a-zA-Z0-9._:-]{8,128}$/.test(requestId), 400, '超分请求标识无效');
      requireCondition([2, 4].includes(scale) && MODELS.includes(model), 400, '超分参数无效');
      const source = await readBody(req, UPLOAD_LIMIT);
      requireCondition(source.length > 0, 400, '请提交图片文件');
      const id = hash(`${visitor.owner}:${requestId}`);
      const fingerprint = hash(Buffer.concat([Buffer.from(`${scale}:${model}:`), source]));
      let job = jobs[id];
      if (job) requireCondition(job.fingerprint === fingerprint, 409, '请求标识已用于其他图片或参数');
      else {
        const today = new Date().toISOString().slice(0, 10);
        const recent = Object.values(jobs).filter(item => item.day === today);
        const budget = limits();
        requireCondition(Object.values(jobs).filter(item => ACTIVE.has(item.status)).length < 4,
          429, '超分队列已满，原图已保留，请稍后重试');
        requireCondition(recent.length < budget.dailyTotal && recent.filter(item => item.owner === visitor.owner).length < budget.dailyPerIp,
          429, '今日超分额度已用完，原图可以正常使用');
        writeFileSync(join(dir, `${id}.source`), source, { mode: 0o600 });
        job = { id, fingerprint, owner: visitor.owner, day: today, createdAt: Date.now(),
          updatedAt: Date.now(), status: 'submitting', model, scale };
        jobs[id] = job; save();
      }
      void advance(job); json(res, 202, view(job)); return true;
    }
    const match = url.pathname.match(/^\/api\/publisher\/enhancement\/([a-f0-9]{64})(?:\/(cancel|result))?$/);
    requireCondition(match, 404, '超分接口不存在');
    const job = jobs[match[1]];
    requireCondition(job && job.owner === visitor.owner, 403, '无权访问此超分任务');
    if (match[2] === 'cancel' && req.method === 'POST') {
      await running.get(job.id);
      if (ACTIVE.has(job.status)) {
        if (job.remoteId) await remote(`/api/upscale/${job.remoteId}/cancel`, { method: 'POST' });
        job.status = 'cancelled'; job.error = undefined; save(); remove(join(dir, `${job.id}.source`));
      }
      json(res, 200, view(job)); return true;
    }
    if (match[2] === 'result' && req.method === 'GET') {
      requireCondition(job.status === 'completed', 409, '高清图片尚未准备好');
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store',
        'Content-Disposition': `inline; filename="opentu-${job.width}x${job.height}.png"` });
      await pipeline(createReadStream(join(dir, `${job.id}.png`)), res); return true;
    }
    requireCondition(!match[2] && req.method === 'GET', 405, '请求方法不允许');
    json(res, 200, view(job)); return true;
  }
  const tick = () => {
    for (const job of Object.values(jobs)) void advance(job);
  };
  const timer = setInterval(tick, 5000); timer.unref(); tick();
  return { handle, close: () => { clearInterval(timer); shutdown.abort(); } };
}
