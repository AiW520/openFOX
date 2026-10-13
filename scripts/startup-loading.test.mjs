import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const html = readFileSync('apps/web/index.html', 'utf8');
const bootScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .find((match) => match[1].includes('var bootReady = false'))[1];

function createBoot() {
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1/', runScripts: 'outside-only',
  });
  const timers = new Map();
  let nextId = 0;
  dom.window.setTimeout = (callback, delay) => {
    const id = ++nextId;
    timers.set(id, { callback, delay });
    return id;
  };
  dom.window.clearTimeout = (id) => timers.delete(id);
  dom.window.setInterval = () => ++nextId;
  dom.window.clearInterval = () => {};
  dom.window.eval(bootScript);
  return { dom, window: dom.window, timers };
}

test('stalled startup offers retry while allowing startup to finish', () => {
  const { dom, window, timers } = createBoot();
  try {
    const retry = window.document.querySelector('[data-app-boot-retry]');
    assert.equal(retry.hidden, true);
    [...timers.values()].find((timer) => timer.delay === 45000).callback();
    assert.equal(retry.hidden, false);
    assert.equal(window.document.documentElement.classList.contains('app-boot-error'), false);
    window.__OPENTU_BOOT__.markReady();
    assert.equal(window.document.documentElement.classList.contains('app-ready'), true);
    assert.ok(![...timers.values()].some((timer) => timer.delay === 45000));
  } finally { dom.window.close(); }
});

test('startup errors provide retry and cancel the slow startup timer', () => {
  const { dom, window, timers } = createBoot();
  try {
    window.__OPENTU_BOOT__.markError('Resource unavailable');
    assert.equal(window.document.querySelector('[data-app-boot-retry]').hidden, false);
    assert.equal(window.document.querySelector('[data-app-boot-tip]').textContent, 'Resource unavailable');
    assert.ok(![...timers.values()].some((timer) => timer.delay === 45000));
  } finally { dom.window.close(); }
});

test('successful startup never leaves a pending retry timer', () => {
  const { dom, window, timers } = createBoot();
  try {
    window.__OPENTU_BOOT__.markReady();
    assert.equal(window.document.querySelector('[data-app-boot-retry]').hidden, true);
    assert.ok(![...timers.values()].some((timer) => timer.delay === 45000));
  } finally { dom.window.close(); }
});
