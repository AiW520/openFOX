import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('sharing toggle distinguishes unsaved changes, failed saves and confirmed server state', async (t) => {
  const dom = new JSDOM(readFileSync(new URL('./public/index.html', import.meta.url), 'utf8'), {
    url: 'http://localhost/publisher', runScripts: 'outside-only',
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  const { document } = window;
  let savedEnabled = false;
  let rejectSave = false;
  let readCount = 0;
  const config = { name: 'Test', baseUrl: 'https://api.tu-zi.com/coding/v1', models: [], hasApiKey: true,
    limits: { dailyPerIp: 20, dailyTotal: 100, perMinute: 6, concurrency: 2, queryConcurrency: 2 },
    usage: { total: 0, activeGeneration: 0, queued: 0, activeQueries: 0 } };
  window.fetch = async (_url, options) => {
    if (options.method === 'PUT') {
      if (rejectSave) return { ok: false, json: async () => ({ error: '保存失败' }) };
      savedEnabled = JSON.parse(options.body).enabled;
    } else readCount++;
    return { ok: true, json: async () => ({ ...config, enabled: savedEnabled }) };
  };
  window.eval(readFileSync(new URL('./public/admin.js', import.meta.url), 'utf8'));
  document.dispatchEvent(new window.CustomEvent('publisher-editor-ready', { detail: {
    setConfig() {}, isLoading: () => false, getModels: () => [], getApiKey: () => '',
  } }));
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  await flush();
  const toggle = (enabled) => {
    document.getElementById('enabled').checked = enabled;
    document.getElementById('enabled').dispatchEvent(new window.Event('change'));
  };
  const submit = () => document.getElementById('config').dispatchEvent(new window.Event('submit', { cancelable: true }));
  const status = () => document.getElementById('statusText').textContent;
  assert.equal(status(), '共享未开放');
  toggle(true);
  assert.equal(status(), '待保存开放');
  assert.equal(document.getElementById('sharingLabel').textContent, '开放共享（待保存）');
  assert.equal(savedEnabled, false);
  toggle(false);
  assert.equal(status(), '共享未开放');
  assert.equal(document.getElementById('serviceStatus').classList.contains('pending'), false);
  toggle(true);
  rejectSave = true;
  submit();
  await flush();
  assert.equal(status(), '待保存开放');
  assert.equal(document.getElementById('message').textContent, '保存失败');
  assert.equal(savedEnabled, false);
  rejectSave = false;
  submit();
  assert.equal(document.getElementById('enabled').disabled, true);
  await flush();
  assert.equal(status(), '共享已开放');
  assert.equal(savedEnabled, true);
  assert.equal(readCount, 2);
  assert.equal(document.getElementById('enabled').disabled, false);
  toggle(false);
  assert.equal(status(), '待保存关闭');
  toggle(true);
  assert.equal(status(), '共享已开放');
  toggle(false);
  submit();
  await flush();
  assert.equal(status(), '共享未开放');
  assert.equal(savedEnabled, false);
});
