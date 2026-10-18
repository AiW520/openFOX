import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createGateway } from './server.mjs';

const secret = 'sk-private-test-only-never-publish';
const config = {
  name: 'Shared', enabled: true, baseUrl: 'https://api.tu-zi.com/coding/v1', apiKey: secret,
  models: [{ id: 'gpt-image-2', label: 'Image', type: 'image' }, { id: 'gpt-test', label: 'Text', type: 'text' },
    { id: 'sora-test', label: 'Video', type: 'video' }],
  limits: { dailyPerIp: 20, dailyTotal: 100, perMinute: 60, concurrency: 2, queryConcurrency: 2 },
};

test('administrator model discovery uses saved or draft credentials without storing or exposing them', async (t) => {
  const draftKey = 'sk-draft-test-only-never-publish';
  const f = await fixture(t, { response: (_url, init) => Response.json({ apiKey: secret, data: [
    { id: 'gpt-test', category: 'text', owned_by: init.headers.Authorization.slice(7), debug: secret, supported_endpoint_types: ['chat'] },
    { id: secret, category: 'text' },
  ] }) });
  const before = readFileSync(join(f.dir, 'config.json'), 'utf8');
  for (const apiKey of ['', draftKey]) {
    const response = await f.request('admin/models', { method: 'POST', headers: { Cookie: f.admin },
      body: JSON.stringify({ baseUrl: config.baseUrl, apiKey }) });
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.ok(!body.includes(secret) && !body.includes(draftKey));
    assert.equal(JSON.parse(body).data.length, 1);
    assert.equal(f.calls.at(-1).init.headers.Authorization, 'Bearer ' + (apiKey || secret));
    assert.equal(f.calls.at(-1).init.redirect, 'error');
    assert.equal(f.calls.at(-1).url, config.baseUrl + '/models');
  }
  assert.equal(readFileSync(join(f.dir, 'config.json'), 'utf8'), before);
  for (const cookie of ['', f.visitor]) {
    assert.equal((await f.request('admin/models', { method: 'POST', headers: { Cookie: cookie }, body: '{}' })).status, 401);
  }
  assert.equal((await f.request('admin/models', { method: 'POST', headers: { Cookie: f.admin, Origin: 'https://attacker.example' }, body: '{}' })).status, 403);
  assert.equal((await f.request('admin/models', { method: 'POST', headers: { Cookie: f.admin },
    body: JSON.stringify({ baseUrl: 'https://attacker.example/v1', apiKey: draftKey }) })).status, 400);
  assert.equal(f.calls.length, 2);
});

test('model discovery sanitizes upstream failures and malformed lists', async (t) => {
  for (const response of [() => new Response(secret, { status: 401 }), () => new Response(secret),
    () => Response.json({ data: {} }), () => { throw new Error(secret); }]) {
    const f = await fixture(t, { response });
    const res = await f.request('admin/models', { method: 'POST', headers: { Cookie: f.admin },
      body: JSON.stringify({ baseUrl: config.baseUrl, apiKey: '' }) });
    assert.equal(res.status, 502);
    assert.ok(!(await res.text()).includes(secret));
  }
});

test('administrator can discover and share the full provider catalog without image or 100-model filters', async (t) => {
  const models = Array.from({ length: 646 }, (_, index) => ({
    id: index === 0 ? 'image-model (preview)+高清' : `provider-model-${index}`,
    category: index < 160 ? 'image' : index < 197 ? 'video' : index < 225 ? 'audio' : 'text',
  }));
  const f = await fixture(t, { response: (url) => String(url).endsWith('/models')
    ? Response.json({ data: [...models, { id: 'bad\nmodel' }, { id: secret }] }) : Response.json({ data: [] }) });
  const discovery = await f.request('admin/models', { method: 'POST', headers: { Cookie: f.admin },
    body: JSON.stringify({ baseUrl: config.baseUrl, apiKey: '' }) });
  assert.equal(discovery.status, 200);
  assert.deepEqual((await discovery.json()).data.map(({ id, category }) => ({ id, category })), models);
  const selected = models.map(({ id, category }) => ({ id, label: id, type: category }));
  const saved = await f.request('admin/config', { method: 'PUT', headers: { Cookie: f.admin },
    body: JSON.stringify({ ...config, apiKey: '', models: selected }) });
  assert.equal(saved.status, 200);
  const publicResponse = await f.proxy('/coding/v1/models', { method: 'GET', body: undefined });
  const body = await publicResponse.text();
  assert.ok(!body.includes(secret));
  assert.deepEqual(JSON.parse(body).data, models);
  assert.equal((await f.proxy('/coding/v1/images/generations', {
    body: JSON.stringify({ model: models[0].id, prompt: 'test' }),
  })).status, 200);
  assert.equal(f.calls.at(-1).init.headers.Authorization, `Bearer ${secret}`);
  assert.equal((await f.proxy('/coding/v1/images/generations', {
    body: JSON.stringify({ model: 'image-not-selected', prompt: 'test' }),
  })).status, 403);
});

test('sharing becomes enabled only after a valid configuration is saved', async (t) => {
  const f = await fixture(t, { skipConfig: true });
  const readConfig = async () => (await (await f.request('admin/config', { headers: { Cookie: f.admin } })).json());
  assert.equal((await readConfig()).enabled, false);
  const invalid = await f.request('admin/config', { method: 'PUT', headers: { Cookie: f.admin },
    body: JSON.stringify({ ...config, apiKey: '' }) });
  assert.equal(invalid.status, 400);
  assert.equal((await readConfig()).enabled, false);
  assert.equal((await f.proxy('/coding/v1/images/generations')).status, 503);
  const saved = await f.request('admin/config', { method: 'PUT', headers: { Cookie: f.admin }, body: JSON.stringify(config) });
  assert.equal(saved.status, 200);
  assert.equal((await readConfig()).enabled, true);
  assert.equal(JSON.parse(readFileSync(join(f.dir, 'config.json'))).enabled, true);
  assert.equal((await f.proxy('/coding/v1/images/generations')).status, 200);
});

async function fixture(t, options = {}) {
  const dir = options.dataDir || mkdtempSync(join(tmpdir(), 'opentu-gateway-'));
  const calls = [];
  const server = createGateway({ dataDir: dir, origin: 'http://localhost',
    queueWaitMs: options.queueWaitMs,
    queueLimit: options.queueLimit,
    responseBudgetBytes: options.responseBudgetBytes,
    upscalerUrl: options.upscalerUrl,
    upscalerToken: options.upscalerToken,
    fetchEnhancement: options.fetchEnhancement,
    adminPassword: 'test-admin-password-12345', accessCode: 'test-access-code-12345', trustProxy: true,
    fetchUpstream: async (url, init) => {
      calls.push({ url: String(url), init });
      return options.response ? options.response(url, init) : Response.json({ id: 'task-123', data: [] });
    } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); if (!options.dataDir) rmSync(dir, { recursive: true, force: true }); });
  const request = (path, init = {}) => new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${server.address().port}/api/publisher/${path}`, {
      method: init.method || 'GET', headers: { Host: 'localhost', Origin: 'http://localhost', 'Content-Type': 'application/json',
        'X-Real-IP': '192.0.2.1', ...init.headers },
      signal: init.signal,
    }, async (res) => {
      try {
        const chunks = [];
        for await (const chunk of res) chunks.push(chunk);
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers }));
      } catch (error) { reject(error); }
    });
    req.on('error', reject);
    req.end(init.body instanceof ArrayBuffer ? Buffer.from(init.body) : init.body);
  });
  const login = async (role = 'tester', ip = '192.0.2.1') => {
    const res = await request('login', { method: 'POST', headers: { 'X-Real-IP': ip }, body: JSON.stringify({ role,
      secret: role === 'admin' ? 'test-admin-password-12345' : 'test-access-code-12345' }) });
    assert.equal(res.status, 200);
    return res.headers.get('set-cookie').split(';')[0];
  };
  const admin = await login('admin');
  if (!options.skipConfig) {
    const saved = await request('admin/config', { method: 'PUT', headers: { Cookie: admin }, body: JSON.stringify({
      ...(options.config || config), limits: { ...config.limits, ...(options.config?.limits || {}) },
    }) });
    assert.equal(saved.status, 200);
  }
  const visitor = await login();
  const proxy = (path, init = {}) => request(`proxy?path=${encodeURIComponent(path)}`, {
    method: 'POST', body: JSON.stringify({ model: 'gpt-image-2', prompt: 'test' }),
    ...init, headers: { Cookie: visitor, ...init.headers },
  });
  return { dir, server, request, login, admin, visitor, proxy, calls };
}

async function waitFor(check) {
  const deadline = Date.now() + 3000;
  while (!await check()) {
    assert.ok(Date.now() < deadline, 'Expected gateway state did not arrive');
    await delay(5);
  }
}

async function usageSnapshot(f) {
  return (await (await f.request('admin/config', { headers: { Cookie: f.admin } })).json()).usage;
}

test('enhancement is optional and requires a session, origin and task ownership', async t => {
  const disabled = await fixture(t);
  assert.equal((await (await disabled.request('enhancement/config')).json()).enabled, false);
  const f = await fixture(t, { upscalerUrl: 'http://inference.local', upscalerToken: secret,
    fetchEnhancement: async () => Response.json({ job_id: 'private-job', status: 'queued' }) });
  const submit = (headers = {}) => f.request('enhancement?scale=4&model=RealESRGAN_x4plus', {
    method: 'POST', body: Buffer.from('fixture'), headers: { Cookie: f.visitor, 'Idempotency-Key': 'ownership-test', ...headers } });
  assert.equal((await submit({ Cookie: '' })).status, 401);
  assert.equal((await submit({ Origin: 'https://attacker.example' })).status, 403);
  const task = await (await submit()).json();
  const other = await f.login('tester', '192.0.2.2');
  assert.equal((await f.request(`enhancement/${task.id}`, { headers: { Cookie: other } })).status, 403);
  await waitFor(async () => (await (await f.request(`enhancement/${task.id}`, { headers: { Cookie: f.visitor } })).json()).status === 'queued');
  const cancelled = await f.request(`enhancement/${task.id}/cancel`, { method: 'POST', headers: { Cookie: f.visitor } });
  assert.equal((await cancelled.json()).status, 'cancelled');
});

test('enhancement deduplicates submissions, persists exact PNG result and hides inference credentials', async t => {
  let submitted = 0;
  const png = Buffer.alloc(24);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
  png.write('IHDR', 12); png.writeUInt32BE(4096,16); png.writeUInt32BE(4096,20);
  const f = await fixture(t, { upscalerUrl: 'http://inference.local', upscalerToken: secret,
    fetchEnhancement: async (url, init) => {
      assert.equal(init.headers.Authorization, `Bearer ${secret}`);
      assert.equal(init.redirect, 'error');
      if (String(url).endsWith('/api/upscale')) { submitted++; assert.equal(init.body.get('resolution'), 'scale'); return Response.json({ job_id: 'persisted-job' }); }
      if (String(url).endsWith('/status')) return Response.json({ status: 'completed', input_width: 1024, input_height: 1024, output_width: 4096, output_height: 4096, debug: secret });
      return new Response(png);
    } });
  const path = 'enhancement?scale=4&model=RealESRGAN_x4plus';
  const init = { method: 'POST', headers: { Cookie: f.visitor, 'Idempotency-Key': 'durable-result' }, body: Buffer.from('fixture') };
  const responses = await Promise.all([f.request(path, init), f.request(path, init)]);
  const tasks = await Promise.all(responses.map(response => response.json()));
  assert.equal(tasks[0].id, tasks[1].id);
  let task;
  await waitFor(async () => { task = await (await f.request(`enhancement/${tasks[0].id}`, { headers: { Cookie: f.visitor } })).json(); return task.status === 'completed'; });
  assert.equal(submitted, 1);
  assert.equal(task.width, 4096); assert.equal(task.height, 4096);
  assert.ok(!JSON.stringify(task).includes(secret));
  assert.deepEqual(readFileSync(join(f.dir, 'enhancement', `${task.id}.png`)), png);
  const download = await f.request(`enhancement/${task.id}/result`, { headers: { Cookie: f.visitor } });
  assert.equal(download.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
  assert.equal((await f.request(path, { ...init, body: 'different-image' })).status, 409);
});

test('credentials stay private on public and administrator reads; forwarding attaches server key', async (t) => {
  const f = await fixture(t);
  for (const [path, cookie] of [['session', f.visitor], ['admin/config', f.admin]]) {
    const res = await f.request(path, { headers: { Cookie: cookie } });
    assert.equal(res.status, 200); assert.ok(!(await res.text()).includes(secret));
  }
  const res = await f.proxy('/coding/v1/images/generations'); assert.equal(res.status, 200);
  assert.equal(f.calls[0].init.headers.Authorization, `Bearer ${secret}`);
  assert.equal(f.calls[0].url, 'https://api.tu-zi.com/coding/v1/images/generations');
  const updated = await f.request('admin/config', { method: 'PUT', headers: { Cookie: f.admin }, body: JSON.stringify({ ...config, apiKey: '' }) });
  assert.equal(updated.status, 200); assert.equal(JSON.parse(readFileSync(join(f.dir, 'config.json'))).apiKey, secret);
});

test('anonymous users, visitors editing admin settings, CSRF and arbitrary destinations are rejected', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.proxy('/coding/v1/images/generations', { headers: { Cookie: '' } })).status, 401);
  assert.equal((await f.request('admin/config', { method: 'PUT', headers: { Cookie: f.visitor }, body: JSON.stringify(config) })).status, 401);
  assert.equal((await f.proxy('/coding/v1/images/generations', { headers: { Origin: 'https://attacker.example' } })).status, 403);
  for (const path of ['https://attacker.example/v1/images/generations', '//attacker.example/v1/images/generations', '/coding/api/token', '/coding/v1/../api/token', '/v1/images/generations']) {
    assert.ok([400, 403].includes((await f.proxy(path)).status), path);
  }
  assert.equal(f.calls.length, 0);
});

test('server validates model type, generation counts, token limits and query parameters', async (t) => {
  const f = await fixture(t);
  for (const body of [{ model: 'unknown' }, { model: 'gpt-test' }, { model: 'gpt-image-2', n: 100 }, { model: 'gpt-image-2', n: 0 }]) {
    assert.ok([400, 403].includes((await f.proxy('/coding/v1/images/generations', { body: JSON.stringify(body) })).status));
  }
  assert.equal((await f.proxy('/coding/v1/chat/completions', { body: JSON.stringify({ model: 'gpt-test', max_tokens: 99999 }) })).status, 400);
  assert.equal((await f.proxy('/coding/v1/images/generations?key=anything')).status, 400);
  assert.equal(f.calls.length, 0);
  assert.equal((await f.proxy('/coding/v1/chat/completions', { body: JSON.stringify({ model: 'gpt-test', messages: [] }) })).status, 200);
  assert.equal(JSON.parse(f.calls[0].init.body).max_completion_tokens, 4096);
});

test('multipart uploads preserve files and reject duplicate model fields', async (t) => {
  const f = await fixture(t);
  const form = new FormData(); form.set('model', 'gpt-image-2'); form.set('prompt', 'edit');
  form.set('image', new Blob(['pixels'], { type: 'image/png' }), 'sample.png');
  const request = new Request('http://localhost/', { method: 'POST', body: form });
  const bytes = await request.arrayBuffer(); const contentType = request.headers.get('content-type');
  assert.equal((await f.proxy('/coding/v1/images/edits', { headers: { 'Content-Type': contentType }, body: bytes })).status, 200);
  assert.ok(f.calls[0].init.body.includes(Buffer.from('pixels')));
  form.append('model', 'gpt-test');
  const invalid = new Request('http://localhost/', { method: 'POST', body: form });
  assert.equal((await f.proxy('/coding/v1/images/edits', { headers: { 'Content-Type': invalid.headers.get('content-type') }, body: await invalid.arrayBuffer() })).status, 400);
});

test('task queries and request recovery are restricted to the submitting tester', async (t) => {
  const f = await fixture(t);
  await f.proxy('/coding/v1/images/generations', { headers: { 'X-Request-Id': 'owned-request' } });
  assert.equal((await f.proxy('/coding/v1/videos/task-123', { method: 'GET', body: undefined })).status, 200);
  assert.equal((await f.proxy('/coding/v1/images/generations/result?request_id=owned-request', { method: 'GET', body: undefined })).status, 200);
  const other = await f.login('tester', '192.0.2.2');
  assert.equal((await f.proxy('/coding/v1/videos/task-123', { method: 'GET', body: undefined, headers: { Cookie: other, 'X-Real-IP': '192.0.2.2' } })).status, 403);
  assert.equal((await f.proxy('/coding/v1/videos/arbitrary', { method: 'GET', body: undefined })).status, 403);
});

test('generation requests queue in FIFO order while task polling uses its separate slot', async (t) => {
  let blocked = false;
  let unblock;
  const hold = new Promise((resolve) => { unblock = resolve; });
  const f = await fixture(t, { queueLimit: 1, config: { ...config, limits: { ...config.limits, concurrency: 1, queryConcurrency: 1 } },
    response: async () => {
      if (blocked) await hold;
      return Response.json({ id: 'task-123' });
    } });
  await f.proxy('/coding/v1/images/generations');
  blocked = true;
  const first = f.proxy('/coding/v1/images/generations');
  await waitFor(() => f.calls.length === 2);
  const second = f.proxy('/coding/v1/images/generations');
  await waitFor(async () => (await usageSnapshot(f)).queued === 1);
  const overflow = await f.proxy('/coding/v1/images/generations');
  assert.equal(overflow.status, 429);
  assert.equal(overflow.headers.get('retry-after'), '5');
  assert.equal(f.calls.length, 2);
  const poll = f.proxy('/coding/v1/videos/task-123', { method: 'GET', body: undefined });
  await waitFor(() => f.calls.length === 3);
  unblock();
  assert.equal((await first).status, 200);
  assert.equal((await poll).status, 200);
  assert.equal((await second).status, 200);
  assert.equal(f.calls.length, 4);
});

test('expired queued generations receive retry guidance without an upstream call', async (t) => {
  let release;
  const hold = new Promise((resolve) => { release = resolve; });
  const f = await fixture(t, { queueLimit: 1, queueWaitMs: 40,
    config: { ...config, limits: { ...config.limits, concurrency: 1 } },
    response: async () => { await hold; return Response.json({}); } });
  const first = f.proxy('/coding/v1/images/generations');
  await waitFor(() => f.calls.length === 1);
  const expired = await f.proxy('/coding/v1/images/generations');
  assert.equal(expired.status, 429);
  assert.equal(expired.headers.get('retry-after'), '5');
  assert.equal(f.calls.length, 1);
  release();
  assert.equal((await first).status, 200);
  assert.equal(JSON.parse(readFileSync(join(f.dir, 'usage.json'))).total, 1);
});

test('query saturation does not prevent generation or consume daily quota', async (t) => {
  let unblock;
  const hold = new Promise((resolve) => { unblock = resolve; });
  const f = await fixture(t, { config: { ...config, limits: { ...config.limits, queryConcurrency: 1 } },
    response: async (_url, init) => {
      if (init.method === 'GET') await hold;
      return Response.json({ id: 'task-123' });
    } });
  await f.proxy('/coding/v1/images/generations');
  const poll = f.proxy('/coding/v1/videos/task-123', { method: 'GET', body: undefined });
  await waitFor(() => f.calls.length === 2);
  try {
    const overflow = await f.proxy('/coding/v1/videos/task-123', { method: 'GET', body: undefined });
    assert.equal(overflow.status, 429);
    assert.equal(overflow.headers.get('retry-after'), '5');
    assert.equal((await f.proxy('/coding/v1/images/generations')).status, 200);
    const snapshot = await usageSnapshot(f);
    assert.equal(snapshot.activeQueries, 1);
    assert.equal(snapshot.total, 2);
  } finally { unblock(); await poll; }
  await waitFor(async () => (await usageSnapshot(f)).active === 0);
});

test('disconnecting a queued request removes it without a call or quota debit', async (t) => {
  let unblock;
  const hold = new Promise((resolve) => { unblock = resolve; });
  const f = await fixture(t, { config: { ...config, limits: { ...config.limits, concurrency: 1 } },
    response: async () => { await hold; return Response.json({}); } });
  const active = f.proxy('/coding/v1/images/generations');
  await waitFor(() => f.calls.length === 1);
  const abort = new AbortController();
  const queued = f.proxy('/coding/v1/images/generations', { signal: abort.signal }).catch((error) => error);
  try {
    await waitFor(async () => (await usageSnapshot(f)).queued === 1);
    abort.abort();
    assert.equal((await queued).name, 'AbortError');
    await waitFor(async () => (await usageSnapshot(f)).queued === 0);
    assert.equal(f.calls.length, 1);
    assert.equal((await usageSnapshot(f)).total, 1);
  } finally { abort.abort(); unblock(); await active; }
});

test('old configuration gains query defaults on restart and old admin clients preserve them', async (t) => {
  const f = await fixture(t);
  const legacy = structuredClone(config);
  delete legacy.limits.queryConcurrency;
  writeFileSync(join(f.dir, 'config.json'), JSON.stringify(legacy));
  const restarted = await fixture(t, { dataDir: f.dir, skipConfig: true });
  const defaults = await (await restarted.request('admin/config', { headers: { Cookie: restarted.admin } })).json();
  assert.equal(defaults.limits.queryConcurrency, 2);
  const update = { ...config, limits: { ...config.limits, queryConcurrency: 3 } };
  assert.equal((await restarted.request('admin/config', { method: 'PUT', headers: { Cookie: restarted.admin }, body: JSON.stringify(update) })).status, 200);
  assert.equal((await restarted.request('admin/config', { method: 'PUT', headers: { Cookie: restarted.admin }, body: JSON.stringify(legacy) })).status, 200);
  const saved = await (await restarted.request('admin/config', { headers: { Cookie: restarted.admin } })).json();
  assert.equal(saved.limits.queryConcurrency, 3);
  for (const value of [0, 5, 1.5]) {
    assert.equal((await f.request('admin/config', { method: 'PUT', headers: { Cookie: f.admin },
      body: JSON.stringify({ ...config, limits: { ...config.limits, queryConcurrency: value } }) })).status, 400);
  }
});

test('JSON responses preserve split UTF-8, base64, redaction and malformed-response errors', async (t) => {
  const data = { id: 'task-123', label: '\u56fe\u7247', debug: secret, data: [{ b64_json: 'AQID'.repeat(1024 * 1024) }] };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const f = await fixture(t, { response: () => new Response(new ReadableStream({
    start(controller) {
      const split = Buffer.from(bytes).indexOf(Buffer.from('\u56fe')) + 1;
      controller.enqueue(bytes.subarray(0, split));
      controller.enqueue(bytes.subarray(split));
      controller.close();
    },
  }), { headers: { 'Content-Type': 'application/json' } }) });
  const res = await f.proxy('/coding/v1/images/generations');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ...data, debug: '[REDACTED]' });
  assert.equal((await f.proxy('/coding/v1/videos/task-123', { method: 'GET', body: undefined })).status, 200);
  const invalid = await fixture(t, { response: () => new Response('{broken', { headers: { 'Content-Type': 'application/json' } }) });
  assert.equal((await invalid.proxy('/coding/v1/images/generations')).status, 502);
  assert.equal((await usageSnapshot(invalid)).active, 0);
});

test('aggregate response budget is bounded and released after response failure', async (t) => {
  let large = true;
  const f = await fixture(t, { responseBudgetBytes: 32, response: () => Response.json(large ? { data: 'x'.repeat(64) } : {}) });
  const rejected = await f.proxy('/coding/v1/images/generations');
  assert.equal(rejected.status, 502);
  large = false;
  assert.equal((await f.proxy('/coding/v1/images/generations')).status, 200);
  assert.equal((await usageSnapshot(f)).active, 0);
});

test('declared oversized response is cancelled before reading its body', async (t) => {
  let cancelled = false;
  const f = await fixture(t, { response: () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(128 * 1024 * 1024 + 1) },
  }) });
  assert.equal((await f.proxy('/coding/v1/images/generations')).status, 502);
  assert.ok(cancelled);
  assert.equal((await usageSnapshot(f)).active, 0);
});

test('generation FIFO advances after an upstream error without leaking a slot', async (t) => {
  let unblock;
  const hold = new Promise((resolve) => { unblock = resolve; });
  const started = [];
  const f = await fixture(t, { config: { ...config, limits: { ...config.limits, concurrency: 1 } },
    response: async (_url, init) => {
      const prompt = JSON.parse(init.body).prompt;
      started.push(prompt);
      if (prompt === 'first') { await hold; throw new Error('synthetic upstream failure'); }
      return Response.json({});
    } });
  const submit = (prompt) => f.proxy('/coding/v1/images/generations', { body: JSON.stringify({ model: 'gpt-image-2', prompt }) });
  const first = submit('first');
  let second;
  let third;
  try {
    await waitFor(() => started.length === 1);
    second = submit('second');
    await waitFor(async () => (await usageSnapshot(f)).queued === 1);
    third = submit('third');
    await waitFor(async () => (await usageSnapshot(f)).queued === 2);
  } finally { unblock(); }
  assert.equal((await first).status, 502);
  assert.equal((await second).status, 200);
  assert.equal((await third).status, 200);
  assert.deepEqual(started, ['first', 'second', 'third']);
  await waitFor(async () => (await usageSnapshot(f)).active === 0);
});

test('concurrent JSON responses share a byte budget until delivery completes', async (t) => {
  let unblock;
  const hold = new Promise((resolve) => { unblock = resolve; });
  let reading = false;
  let count = 0;
  const f = await fixture(t, { responseBudgetBytes: 40, response: () => {
    if (++count !== 1) return Response.json({ data: 'y'.repeat(16) });
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('{"data":"' + 'x'.repeat(16))); },
      async pull(controller) {
        reading = true;
        await hold;
        controller.enqueue(new TextEncoder().encode('"}'));
        controller.close();
      },
    }), { headers: { 'Content-Type': 'application/json' } });
  } });
  const first = f.proxy('/coding/v1/images/generations');
  try {
    await waitFor(() => reading);
    assert.equal((await f.proxy('/coding/v1/images/generations')).status, 502);
  } finally { unblock(); }
  assert.equal((await first).status, 200);
  assert.equal((await f.proxy('/coding/v1/images/generations')).status, 200);
});

test('daily quotas survive a new session and restart; global quotas cover different IPs', async (t) => {
  const f = await fixture(t);
  const low = { ...config, limits: { ...config.limits, dailyPerIp: 1, dailyTotal: 2 } };
  assert.equal((await f.request('admin/config', { method: 'PUT', headers: { Cookie: f.admin }, body: JSON.stringify(low) })).status, 200);
  assert.equal((await f.proxy('/coding/v1/images/generations')).status, 200);
  const visitor = await f.login();
  assert.equal((await f.proxy('/coding/v1/images/generations', { headers: { Cookie: visitor } })).status, 429);
  const other = await f.login('tester', '192.0.2.2');
  assert.equal((await f.proxy('/coding/v1/images/generations', { headers: { Cookie: other, 'X-Real-IP': '192.0.2.2' } })).status, 200);
  const third = await f.login('tester', '192.0.2.3');
  assert.equal((await f.proxy('/coding/v1/images/generations', { headers: { Cookie: third, 'X-Real-IP': '192.0.2.3' } })).status, 429);
  assert.equal(JSON.parse(readFileSync(join(f.dir, 'usage.json'))).total, 2);
  const restarted = await fixture(t, { dataDir: f.dir });
  assert.equal((await restarted.proxy('/coding/v1/images/generations')).status, 200); // fixture increased limits, retained usage
  assert.equal(JSON.parse(readFileSync(join(f.dir, 'usage.json'))).total, 3);
});

test('streaming and JSON never return the API key; upstream errors and headers are sanitized', async (t) => {
  const f = await fixture(t, { response: () => new Response(new ReadableStream({ start(controller) {
    for (const text of ['data: {"text":"', secret.slice(0, 8), secret.slice(8), '"}\n\n', 'data: [DONE]\n\n']) controller.enqueue(new TextEncoder().encode(text));
    controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream', 'X-Api-Key': secret, 'Set-Cookie': `secret=${secret}` } }) });
  const response = await f.proxy('/coding/v1/chat/completions', { body: JSON.stringify({ model: 'gpt-test', stream: true }) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('x-api-key'), null); assert.equal(response.headers.get('set-cookie'), null);
  const text = await response.text(); assert.ok(!text.includes(secret)); assert.ok(text.includes('[REDACTED]')); assert.ok(text.includes('[DONE]'));
  const jsonFixture = await fixture(t, { response: () => Response.json({ debug: secret }) });
  assert.ok(!(await (await jsonFixture.proxy('/coding/v1/images/generations')).text()).includes(secret));
  const errorFixture = await fixture(t, { response: () => new Response(secret, { status: 401 }) });
  const failure = await errorFixture.proxy('/coding/v1/images/generations'); assert.equal(failure.status, 502); assert.ok(!(await failure.text()).includes(secret));
});

test('upstream errors preserve bounded diagnostic messages without credentials', async (t) => {
  const f = await fixture(t, { response: () => Response.json({ error: {
    message: `No available channel for gpt-image-2; ${secret}; ${encodeURIComponent(secret)}; Bearer hidden-token; sk-other-provider-key`,
  }, debug: 'private diagnostic data' }, { status: 503 }) });
  const response = await f.proxy('/coding/v1/images/generations');
  assert.equal(response.status, 502);
  const text = await response.text();
  assert.ok(text.includes('No available channel for gpt-image-2'));
  for (const privateValue of [secret, encodeURIComponent(secret), 'hidden-token', 'sk-other-provider-key', 'private diagnostic data']) {
    assert.ok(!text.includes(privateValue));
  }
  for (const body of ['<html>private error</html>', JSON.stringify({ error: { message: 'x'.repeat(20000) } })]) {
    const invalid = await fixture(t, { response: () => new Response(body, { status: 503 }) });
    const result = await (await invalid.proxy('/coding/v1/images/generations')).json();
    assert.equal(result.error, '模型服务请求失败（503）');
  }
});

test('rotating access code invalidates existing visitor sessions', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('admin/access-code', { method: 'PUT', headers: { Cookie: f.admin }, body: JSON.stringify({ code: 'replacement-access-code' }) })).status, 200);
  assert.equal((await f.proxy('/coding/v1/images/generations')).status, 401);
  const old = await f.request('login', { method: 'POST', body: JSON.stringify({ role: 'tester', secret: 'test-access-code-12345' }) }); assert.equal(old.status, 401);
});
