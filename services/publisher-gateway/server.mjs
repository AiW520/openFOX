import http from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable, Transform } from 'node:stream';
import { finished, pipeline } from 'node:stream/promises';
import { createEnhancement } from './enhancement.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DAY = 86_400_000;
const BODY_LIMIT = 64 * 1024 * 1024;
const RESPONSE_LIMIT = 128 * 1024 * 1024;
const QUEUE_LIMIT = 8;
const QUEUE_WAIT_MS = 30_000;
const PUBLIC_TYPES = ['text', 'image', 'video', 'audio'];
// Model IDs are request fields, not destinations; preserve provider names and punctuation.
const validModelId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 512 &&
  id === id.trim() && !/[\x00-\x1f\x7f]/.test(id);
const initialConfig = {
  enabled: false,
  name: '平台共享模型',
  baseUrl: 'https://api.tu-zi.com/coding/v1',
  apiKey: '',
  models: [{ id: 'gpt-image-2', label: 'GPT Image 2', type: 'image' }],
  limits: { dailyPerIp: 20, dailyTotal: 100, perMinute: 6, concurrency: 2, queryConcurrency: 2 },
};

class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

function requireCondition(value, status, message) {
  if (!value) throw new HttpError(status, message);
}

function privateWrite(path, value) {
  const temp = `${path}.tmp`;
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  renameSync(temp, path);
}

function load(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

function normalizeConfig(input, previous) {
  requireCondition(input && typeof input === 'object', 400, '配置格式错误');
  const baseUrl = new URL(String(input.baseUrl || ''));
  requireCondition(
    baseUrl.protocol === 'https:' &&
    ['api.tu-zi.com', 'business.tu-zi.com', 'test-business.tu-zi.com'].includes(baseUrl.hostname) &&
    !baseUrl.username && !baseUrl.password && !baseUrl.search && !baseUrl.hash &&
    !baseUrl.port && /^\/(?:coding\/)?v1\/?$/.test(baseUrl.pathname),
    400, '接口地址必须是 Tuzi 的 HTTPS /v1 或 /coding/v1 地址'
  );
  requireCondition(Array.isArray(input.models) && input.models.length <= 10000, 400, '模型数量最多 10000 个');
  const ids = new Set();
  const models = input.models.map((model) => {
    requireCondition(model && validModelId(model.id) &&
      PUBLIC_TYPES.includes(model.type) && !ids.has(model.id), 400, '模型 ID、类型错误或重复');
    ids.add(model.id);
    return { id: model.id, label: String(model.label || model.id).slice(0, 100), type: model.type };
  });
  const limits = {};
  for (const [key, max] of Object.entries({ dailyPerIp: 1000, dailyTotal: 10000, perMinute: 60, concurrency: 4, queryConcurrency: 4 })) {
    const value = Number(input.limits?.[key] ?? (key === 'queryConcurrency' ? previous.limits?.[key] ?? 2 : undefined));
    requireCondition(Number.isInteger(value) && value >= 1 && value <= max, 400, `限额 ${key} 无效`);
    limits[key] = value;
  }
  const apiKey = typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : previous.apiKey;
  requireCondition(!apiKey || (apiKey.length >= 10 && apiKey.length <= 512 && !/[\r\n]/.test(apiKey)), 400, 'API Key 格式错误');
  requireCondition(!input.enabled || (apiKey && models.length), 400, '启用前请填写 API Key 和至少一个模型');
  return {
    enabled: input.enabled === true, name: String(input.name || '平台共享模型').slice(0, 80),
    baseUrl: baseUrl.href.replace(/\/+$/, ''), apiKey, models, limits,
  };
}

function redact(value, key) {
  return key && value.includes(key) ? value.replaceAll(key, '[REDACTED]') : value;
}

async function upstreamErrorMessage(response, key) {
  const fallback = `模型服务请求失败（${response.status}）`;
  try {
    const raw = await readUpstreamText(response, 16 * 1024);
    const data = JSON.parse(raw);
    const message = typeof data?.error === 'string' ? data.error
      : data?.error?.message ?? data?.message;
    if (typeof message !== 'string' || !message.trim()) return fallback;
    let safe = message;
    for (const secret of [key, encodeURIComponent(key), JSON.stringify(key).slice(1, -1)]) {
      safe = redact(safe, secret);
    }
    safe = safe.replace(/Bearer\s+\S+|sk-[A-Za-z0-9_-]+/gi, '[REDACTED]')
      .replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 300);
    return `${fallback}：${safe}`;
  } catch {
    return fallback;
  }
}

function requestGate(getLimit, maxQueued = 0, waitMs = QUEUE_WAIT_MS) {
  let active = 0;
  const queue = [];
  function grant() {
    active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active -= 1;
      drain();
    };
  }
  function drain() {
    while (queue.length && active < getLimit()) {
      const next = queue.shift();
      next.cleanup();
      next.resolve(grant());
    }
  }
  return {
    get active() { return active; },
    get queued() { return queue.length; },
    drain,
    acquire(signal) {
      if (signal.aborted) return Promise.reject(signal.reason);
      if (!queue.length && active < getLimit()) return Promise.resolve(grant());
      if (queue.length >= maxQueued) return Promise.reject(new HttpError(429, '当前任务较多，请稍后再试', 5));
      return new Promise((resolve, reject) => {
        const cancel = (error) => {
          const index = queue.indexOf(entry);
          if (index < 0) return;
          queue.splice(index, 1);
          entry.cleanup();
          reject(error);
        };
        const abort = () => cancel(signal.reason);
        const timer = setTimeout(() => cancel(new HttpError(429, '等待时间较长，请稍后再试', 5)), waitMs);
        const entry = { resolve, cleanup() { clearTimeout(timer); signal.removeEventListener('abort', abort); } };
        queue.push(entry);
        signal.addEventListener('abort', abort, { once: true });
      });
    },
  };
}

// Preserve a tail so a secret split across SSE/network chunks cannot escape.
function redactingStream(key) {
  const decoder = new TextDecoder();
  let pending = '';
  return new Transform({
    transform(chunk, _encoding, callback) {
      pending = redact(pending + decoder.decode(chunk, { stream: true }), key);
      const end = Math.max(0, pending.length - Math.max(key.length, 32));
      this.push(pending.slice(0, end));
      pending = pending.slice(end);
      callback();
    },
    flush(callback) { this.push(redact(pending + decoder.decode(), key)); callback(); },
  });
}

async function readBody(req, max = BODY_LIMIT) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    requireCondition(size <= max, 413, '请求体过大');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  try { return JSON.parse((await readBody(req, 256 * 1024)).toString('utf8')); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'JSON 格式错误'); }
}

async function readUpstreamText(response, max = RESPONSE_LIMIT, onBytes = () => {}) {
  if (!response.body) return '';
  if (Number(response.headers.get('content-length')) > max) {
    await response.body.cancel();
    throw new HttpError(502, '模型响应过大');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    requireCondition(size <= max, 502, '模型响应过大');
    onBytes(chunk.length);
    chunks.push(chunk);
  }
  const bytes = chunks.length === 1
    ? Buffer.from(chunks[0].buffer, chunks[0].byteOffset, chunks[0].byteLength)
    : Buffer.concat(chunks, size);
  return bytes.toString('utf8');
}

function json(res, status, data) {
  res.writeHead(status, { ...res.getHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

export function createGateway(options = {}) {
  const dataDir = options.dataDir || process.env.PUBLISHER_DATA_DIR;
  const origin = options.origin || process.env.PUBLISHER_ORIGIN;
  const adminPassword = options.adminPassword || process.env.PUBLISHER_ADMIN_PASSWORD;
  let accessCode = options.accessCode || process.env.PUBLISHER_ACCESS_CODE;
  if (!dataDir || !origin || !adminPassword || adminPassword.length < 16 || !accessCode || accessCode.length < 12) {
    throw new Error('Set PUBLISHER_DATA_DIR, PUBLISHER_ORIGIN, a 16+ character admin password and 12+ character access code');
  }
  const secure = new URL(origin).protocol === 'https:';
  if (!secure && !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Public gateway requires HTTPS');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const configPath = join(dataDir, 'config.json');
  const usagePath = join(dataDir, 'usage.json');
  const codePath = join(dataDir, 'access-code.json');
  let config = load(configPath, structuredClone(initialConfig));
  config.limits = { ...initialConfig.limits, ...config.limits };
  let usage = load(usagePath, { day: '', total: 0, ips: {}, tasks: {} });
  const salt = randomBytes(16);
  const adminHash = scryptSync(adminPassword, salt, 32);
  let codeHash = load(codePath, null);
  if (!codeHash) {
    codeHash = { salt: randomBytes(16).toString('hex') };
    codeHash.hash = scryptSync(accessCode, codeHash.salt, 32).toString('hex');
    privateWrite(codePath, codeHash);
  }
  accessCode = undefined;
  const sessions = new Map();
  const attempts = new Map();
  const minuteUsage = new Map();
  const generationGate = requestGate(() => config.limits.concurrency, options.queueLimit ?? QUEUE_LIMIT, options.queueWaitMs ?? QUEUE_WAIT_MS);
  const queryGate = requestGate(() => config.limits.queryConcurrency);
  let bufferedResponseBytes = 0;
  const fetchUpstream = options.fetchUpstream || fetch;
  const getIp = (req) => options.trustProxy
    ? String(req.headers['x-real-ip'] || req.socket.remoteAddress)
    : req.socket.remoteAddress;
  const identity = (req) => createHash('sha256').update(getIp(req)).digest('hex');

  function session(req, role) {
    const cookieName = role === 'admin' ? 'opentu_admin' : 'opentu_tester';
    const cookie = String(req.headers.cookie || '').split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const value = sessions.get(cookie);
    requireCondition(value && value.role === role && value.expires > Date.now(), 401, '请重新登录');
    return value;
  }

  function checkMutation(req) {
    requireCondition(req.headers.origin === origin, 403, '请求来源不允许');
    requireCondition(req.headers['sec-fetch-site'] !== 'cross-site', 403, '请求来源不允许');
  }

  const enhancement = createEnhancement({ dataDir,
    serviceUrl: options.upscalerUrl || process.env.PUBLISHER_UPSCALER_URL,
    token: options.upscalerToken || process.env.PUBLISHER_UPSCALER_TOKEN,
    fetchService: options.fetchEnhancement || fetch,
    authorize: req => { try { return session(req, 'tester'); } catch { return session(req, 'admin'); } },
    checkMutation, readBody, json, requireCondition, limits: () => config.limits });

  function limitsSnapshot() {
    const day = new Date().toISOString().slice(0, 10);
    if (usage.day !== day) usage = { day, total: 0, ips: {}, tasks: usage.tasks || {} };
    for (const [id, task] of Object.entries(usage.tasks)) {
      if (task.expires < Date.now()) delete usage.tasks[id];
    }
    return { ...usage, active: generationGate.active + queryGate.active,
      activeGeneration: generationGate.active, activeQueries: queryGate.active,
      queued: generationGate.queued, limits: config.limits };
  }

  function reserve(req) {
    limitsSnapshot();
    const id = identity(req);
    const count = usage.ips[id] || 0;
    requireCondition(count < config.limits.dailyPerIp && usage.total < config.limits.dailyTotal, 429, '今日调用额度已用完');
    const minute = Math.floor(Date.now() / 60_000);
    const recent = minuteUsage.get(id);
    requireCondition(!recent || recent.minute !== minute || recent.count < config.limits.perMinute, 429, '调用过于频繁，请稍后再试');
    minuteUsage.set(id, { minute, count: recent?.minute === minute ? recent.count + 1 : 1 });
    usage.total += 1;
    usage.ips[id] = count + 1;
    privateWrite(usagePath, usage);
  }

  function publicConfig() {
    return { name: config.name, baseUrl: config.baseUrl, enabled: config.enabled && Boolean(config.apiKey), models: config.models };
  }

  function ownTask(id, visitor) {
    limitsSnapshot();
    requireCondition(id && usage.tasks[id]?.owner === visitor.owner, 403, '无权访问此任务');
  }

  function storeTask(id, visitor) {
    if (typeof id !== 'string' || id.length > 240) return;
    usage.tasks[id] = { owner: visitor.owner, expires: Date.now() + DAY * 2 };
    privateWrite(usagePath, usage);
  }

  async function proxy(req, res, url) {
    const visitor = session(req, 'tester');
    requireCondition(config.enabled && config.apiKey, 503, '发布者尚未启用共享模型');
    requireCondition(req.method === 'POST' || req.method === 'GET', 405, '请求方法不允许');
    if (req.method === 'POST') checkMutation(req);
    const controller = new AbortController();
    let timer;
    let release;
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    req.on('aborted', disconnect);
    try {
      const raw = url.searchParams.get('path') || '';
      requireCondition(raw.startsWith('/') && !raw.startsWith('//') && !/[\\\r\n#%]/.test(raw.split('?')[0]), 400, '接口路径不允许');
      const target = new URL(raw, config.baseUrl);
      const requestBaseUrl = config.baseUrl;
      requireCondition(target.origin === new URL(config.baseUrl).origin, 400, '接口地址不允许');
      const prefix = new URL(config.baseUrl).pathname.replace(/\/v1$/, '');
      requireCondition(!prefix || target.pathname.startsWith(`${prefix}/`), 400, '接口路径不允许');
      const route = target.pathname.slice(prefix.length).replace(/^\/v1(?=\/)/, '');
      const modelRoute = route.match(/^\/v1beta\/models\/([^/]+):(generateContent|streamGenerateContent)$/);
      const postKinds = {
        '/chat/completions': ['text'], '/responses': ['text'],
        '/images/generations': ['image'], '/images/edits': ['image'],
        '/videos': ['video', 'image'], '/audio/speech': ['audio'],
        '/suno/submit/music': ['audio'], '/suno/submit/lyrics': ['audio'],
      };
      if (req.method === 'GET' && route === '/models') {
        json(res, 200, { data: config.models.map(({ id, type }) => ({ id, category: type })) });
        return;
      }
      for (const name of [...target.searchParams.keys()]) {
        requireCondition(['request_id', 'alt'].includes(name), 400, '查询参数不允许');
      }
      let body;
      let contentType;
      const headers = {};
      if (req.method === 'POST') {
        const kinds = modelRoute ? ['text', 'image'] : postKinds[route];
        requireCondition(kinds, 403, '该接口未开放');
        release = await generationGate.acquire(controller.signal);
        controller.signal.throwIfAborted();
        session(req, 'tester');
        requireCondition(config.enabled && config.apiKey, 503, '发布者尚未启用共享模型');
        requireCondition(config.baseUrl === requestBaseUrl, 409, '模型服务配置已更新，请重新发起请求');
        timer = setTimeout(() => controller.abort(), 10 * 60_000);
        body = await readBody(req);
        contentType = String(req.headers['content-type'] || '');
        let model;
        let fields;
        if (contentType.startsWith('application/json')) {
          try { fields = JSON.parse(body.toString('utf8')); } catch { throw new HttpError(400, 'JSON 格式错误'); }
          requireCondition(fields && typeof fields === 'object' && !Array.isArray(fields), 400, '请求格式错误');
          model = modelRoute ? modelRoute[1] : fields.model || fields.model_name;
        } else if (contentType.startsWith('multipart/form-data')) {
          const form = await new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': contentType }, body }).formData();
          requireCondition(form.getAll('model').length === 1, 400, '必须指定一个模型');
          model = form.get('model');
          fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string'));
        } else {
          throw new HttpError(415, '仅支持 JSON 或 multipart 请求');
        }
        const selected = config.models.find((candidate) => candidate.id === model && kinds.includes(candidate.type));
        requireCondition(selected, 403, '该模型未开放');
        for (const name of ['n', 'batch_size', 'num_images', 'num_outputs']) {
          if (fields[name] !== undefined) requireCondition(Number.isInteger(Number(fields[name])) && Number(fields[name]) >= 1 && Number(fields[name]) <= 4, 400, '单次最多生成 4 个结果');
        }
        for (const name of ['max_tokens', 'max_completion_tokens', 'max_output_tokens']) {
          if (fields[name] !== undefined) requireCondition(Number(fields[name]) > 0 && Number(fields[name]) <= 8192, 400, '单次输出最多 8192 tokens');
        }
        if (route === '/chat/completions' && !fields.max_tokens && !fields.max_completion_tokens) {
          fields.max_completion_tokens = 4096;
          body = Buffer.from(JSON.stringify(fields));
        }
        if (route === '/responses' && !fields.max_output_tokens) {
          fields.max_output_tokens = 4096;
          body = Buffer.from(JSON.stringify(fields));
        }
        if (fields.character_from_task) ownTask(fields.character_from_task, visitor);
        const requestId = String(req.headers['x-request-id'] || '');
        if (/^[A-Za-z0-9_-]{1,120}$/.test(requestId)) {
          requireCondition(!usage.tasks[requestId] || usage.tasks[requestId].owner === visitor.owner, 403, '请求 ID 已被使用');
          headers['X-Request-Id'] = requestId;
        }
        reserve(req);
        if (headers['X-Request-Id']) {
          storeTask(requestId, visitor);
        }
      } else {
        const taskRoute = route.match(/^\/videos\/([A-Za-z0-9_:-]+)(?:\/content)?$/) || route.match(/^\/suno\/fetch\/([A-Za-z0-9_-]+)$/);
        if (taskRoute) ownTask(taskRoute[1], visitor);
        else if (route === '/images/generations/result') ownTask(target.searchParams.get('request_id'), visitor);
        else throw new HttpError(403, '该接口未开放');
        release = await queryGate.acquire(controller.signal);
        timer = setTimeout(() => controller.abort(), 10 * 60_000);
      }
      const secret = config.apiKey;
      const upstream = await fetchUpstream(target, {
        method: req.method, body, signal: controller.signal, redirect: 'error',
        headers: { ...headers, Authorization: `Bearer ${secret}`, ...(contentType ? { 'Content-Type': contentType } : {}) },
      });
      if (!upstream.ok) {
        const error = await upstreamErrorMessage(upstream, secret);
        json(res, upstream.status === 429 ? 429 : 502, { error });
        return;
      }
      const responseType = upstream.headers.get('content-type') || 'application/json';
      if (responseType.includes('json')) {
        // Hold the shared byte budget until the client finishes receiving this response.
        let responseBytes = 0;
        try {
          const safe = redact(await readUpstreamText(upstream, RESPONSE_LIMIT, (bytes) => {
            requireCondition(bufferedResponseBytes + bytes <= (options.responseBudgetBytes ?? RESPONSE_LIMIT), 502, '模型响应占用过高，请稍后再试');
            bufferedResponseBytes += bytes;
            responseBytes += bytes;
          }), secret);
          {
            let result;
            try { result = JSON.parse(safe); } catch { throw new HttpError(502, '模型响应格式错误'); }
            if (req.method === 'POST') {
              for (const id of [result?.id, result?.task_id, result?.taskId, result?.data?.id, result?.data?.task_id]) storeTask(id, visitor);
            }
          }
          res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(safe);
          await finished(res, { cleanup: true });
        } finally { bufferedResponseBytes -= responseBytes; }
      } else {
        res.writeHead(upstream.status, { 'Content-Type': responseType, 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        if (upstream.body) {
          const stream = Readable.fromWeb(upstream.body);
          if (/text|event-stream/.test(responseType)) await pipeline(stream, redactingStream(secret), res);
          else await pipeline(stream, res);
        } else res.end();
      }
    } finally {
      release?.();
      clearTimeout(timer);
      res.off('close', disconnect);
      req.off('aborted', disconnect);
    }
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      requireCondition(req.headers.host === new URL(origin).host, 400, 'Host 不允许');
      const url = new URL(req.url, origin);
      if (await enhancement.handle(req, res, url)) return;
      const publicFiles = {
        '/publisher': 'index.html', '/publisher/': 'index.html',
        '/publisher/admin.js': 'admin.js', '/publisher/style.css': 'style.css',
        '/publisher/assets/provider-editor.js': 'assets/provider-editor.js',
        '/publisher/assets/provider-editor.css': 'assets/provider-editor.css',
      };
      if (req.method === 'GET' && Object.hasOwn(publicFiles, url.pathname)) {
        const file = publicFiles[url.pathname];
        res.writeHead(200, {
          'Content-Type': file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        });
        res.end(readFileSync(join(here, 'public', file)));
        return;
      }
      if (url.pathname === '/api/publisher/health' && req.method === 'GET') { json(res, 200, { ok: true }); return; }
      if (url.pathname === '/api/publisher/login' && req.method === 'POST') {
        checkMutation(req);
        const input = await readJson(req);
        const role = input.role === 'admin' ? 'admin' : 'tester';
        const ip = `${identity(req)}:${role}`;
        const prior = attempts.get(ip);
        const attempt = prior && prior.until > Date.now() ? prior : { count: 0, until: Date.now() + 15 * 60_000 };
        requireCondition(attempt.count < 10, 429, '登录尝试过多，请 15 分钟后再试');
        attempt.count += 1;
        attempts.set(ip, attempt);
        const secret = String(input.secret || '');
        requireCondition(secret.length <= 512, 401, '登录凭据错误');
        const expected = role === 'admin' ? adminHash : Buffer.from(codeHash.hash, 'hex');
        const actual = scryptSync(secret, role === 'admin' ? salt : codeHash.salt, 32);
        requireCondition(timingSafeEqual(actual, expected), 401, '登录凭据错误');
        attempts.delete(ip);
        requireCondition(sessions.size < 10000, 503, '当前访问人数过多');
        const token = randomBytes(32).toString('base64url');
        sessions.set(token, { role, owner: identity(req), expires: Date.now() + DAY });
        res.setHeader('Set-Cookie', `opentu_${role === 'admin' ? 'admin' : 'tester'}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure ? '; Secure' : ''}`);
        json(res, 200, { ok: true }); return;
      }
      if (url.pathname === '/api/publisher/logout' && req.method === 'POST') {
        checkMutation(req);
        for (const name of ['opentu_admin', 'opentu_tester']) {
          const token = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
          sessions.delete(token);
        }
        res.setHeader('Set-Cookie', ['opentu_admin', 'opentu_tester'].map((name) => `${name}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`));
        json(res, 200, { ok: true }); return;
      }
      if (url.pathname === '/api/publisher/session' && req.method === 'GET') {
        session(req, 'tester');
        json(res, 200, publicConfig()); return;
      }
      if (url.pathname === '/api/publisher/admin/models' && req.method === 'POST') {
        session(req, 'admin'); checkMutation(req);
        const input = await readJson(req);
        const draft = normalizeConfig({ ...config, enabled: false, baseUrl: input.baseUrl, apiKey: input.apiKey }, config);
        requireCondition(draft.apiKey, 400, '请填写 API Key');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        try {
          const upstream = await fetchUpstream(new URL(draft.baseUrl + '/models'), {
            method: 'GET', redirect: 'error', signal: controller.signal,
            headers: { Authorization: 'Bearer ' + draft.apiKey },
          });
          if (!upstream.ok) {
            await upstream.body?.cancel();
            throw new HttpError(502, '模型获取失败，请检查接口地址和 API Key');
          }
          let result;
          try { result = JSON.parse(await readUpstreamText(upstream, 4 * 1024 * 1024)); }
          catch { throw new HttpError(502, '模型列表格式错误'); }
          requireCondition(Array.isArray(result?.data) && result.data.length <= 10000, 502, '模型列表格式错误');
          const clean = (value) => typeof value === 'string'
            ? redact(redact(value, draft.apiKey), config.apiKey).slice(0, 160) : undefined;
          const data = result.data.filter((item) => item && validModelId(item.id) &&
            !item.id.includes(draft.apiKey) && (!config.apiKey || !item.id.includes(config.apiKey)))
            .map((item) => ({
              id: item.id, category: clean(item.category), owned_by: clean(item.owned_by),
              supported_endpoint_types: Array.isArray(item.supported_endpoint_types)
                ? item.supported_endpoint_types.slice(0, 20).map(clean).filter(Boolean) : undefined,
            }));
          json(res, 200, { data }); return;
        } finally { clearTimeout(timer); }
      }
      if (url.pathname === '/api/publisher/admin/config') {
        session(req, 'admin');
        if (req.method === 'GET') {
          const { apiKey, ...safe } = config;
          const snapshot = limitsSnapshot();
          json(res, 200, { ...safe, hasApiKey: Boolean(apiKey), usage: { day: snapshot.day, total: snapshot.total,
            active: snapshot.active, activeGeneration: snapshot.activeGeneration, activeQueries: snapshot.activeQueries, queued: snapshot.queued } }); return;
        }
        if (req.method === 'PUT') {
          checkMutation(req);
          const next = normalizeConfig(await readJson(req), config);
          privateWrite(configPath, next);
          config = next;
          generationGate.drain();
          queryGate.drain();
          json(res, 200, { ok: true }); return;
        }
      }
      if (url.pathname === '/api/publisher/admin/access-code' && req.method === 'PUT') {
        session(req, 'admin'); checkMutation(req);
        const { code } = await readJson(req);
        requireCondition(typeof code === 'string' && code.length >= 12 && code.length <= 128, 400, '访问码应为 12 到 128 个字符');
        const next = { salt: randomBytes(16).toString('hex') };
        next.hash = scryptSync(code, next.salt, 32).toString('hex');
        privateWrite(codePath, next); codeHash = next;
        for (const [token, value] of sessions) if (value.role === 'tester') sessions.delete(token);
        json(res, 200, { ok: true }); return;
      }
      if (url.pathname === '/api/publisher/proxy') { await proxy(req, res, url); return; }
      throw new HttpError(404, '接口不存在');
    } catch (error) {
      if (res.destroyed) return;
      if (error instanceof HttpError && error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
      if (!res.headersSent) json(res, error instanceof HttpError ? error.status : 502,
        { error: error instanceof HttpError ? error.message : '服务请求失败，请检查发布者配置' });
      else res.destroy();
    }
  });
  server.requestTimeout = 90_000;
  const cleanup = setInterval(() => {
    for (const [id, value] of sessions) if (value.expires < Date.now()) sessions.delete(id);
    for (const [id, value] of attempts) if (value.until < Date.now()) attempts.delete(id);
    for (const [id, value] of minuteUsage) if (value.minute < Math.floor(Date.now() / 60_000) - 1) minuteUsage.delete(id);
  }, 60_000);
  cleanup.unref();
  server.on('close', () => { clearInterval(cleanup); enhancement.close(); });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = createGateway({ trustProxy: process.env.PUBLISHER_TRUST_PROXY === '1' });
  server.listen(Number(process.env.PUBLISHER_PORT || 7211), '127.0.0.1', () => console.log('Publisher gateway ready on localhost'));
}
