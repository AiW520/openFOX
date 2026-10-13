import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const label = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Use a simple measurement label');
const root = path.resolve('dist/apps/web');
const output = path.resolve('tmp/canvas-performance', label);
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
    const metadata = await stat(file).catch(() => null);
    if (!metadata?.isFile()) {
      if (path.extname(pathname)) { res.writeHead(404).end(); return; }
      file = path.join(root, 'index.html');
    }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(await readFile(file));
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const runs = [];
try {
  browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/publisher/session', route => route.fulfill({ json: {
      enabled: true, name: 'Performance fixture', baseUrl: 'https://api.tu-zi.com/v1',
      models: [{ id: 'gpt-image-2.5', label: 'GPT-image-2.5', type: 'image' }],
    } }));
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin !== origin) return route.abort();
      return route.fallback();
    });
    await page.addInitScript(() => {
      window.__canvasLongTasks = [];
      new PerformanceObserver(list => window.__canvasLongTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
    });
    for (const phase of ['cold', 'reload']) {
      let homeMs = null;
      let canvasStartMs = 0;
      if (phase === 'cold') {
        await page.goto(`${origin}/?experience=new&sw=0`);
        try {
          await page.getByRole('button', { name: '打开画布', exact: true }).waitFor();
        } catch (error) {
          await page.screenshot({ path: path.join(output, `${viewport.width}-home-failure.png`), fullPage: true });
          console.error(JSON.stringify({ errors, text: (await page.locator('body').innerText()).slice(-2000) }));
          throw error;
        }
        homeMs = await page.evaluate(() => performance.now());
        canvasStartMs = homeMs;
        await page.getByRole('button', { name: '打开画布', exact: true }).click();
      }
      else await page.reload();
      try {
        await page.locator('.workflow-app-root .select-none.overflow-hidden').waitFor({ state: 'visible', timeout: 90000 });
      } catch (error) {
        await page.screenshot({ path: path.join(output, `${viewport.width}-failure.png`), fullPage: true });
        console.error(JSON.stringify({ url: page.url(), errors, text: (await page.locator('body').innerText()).slice(-4000) }));
        throw error;
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const metrics = await page.evaluate(() => ({
        readyMs: performance.now(),
        resources: performance.getEntriesByType('resource').filter(e => /\.(js|css)(?:\?|$)/.test(e.name)).map(e => ({ url: e.name, duration: e.duration, bytes: e.decodedBodySize, transfer: e.transferSize })),
        longTasks: window.__canvasLongTasks,
      }));
      runs.push({ viewport, phase, homeMs, canvasMs: metrics.readyMs - canvasStartMs, ...metrics, errors: [...errors] });
      await page.screenshot({ path: path.join(output, `${viewport.width}-${phase}.png`), fullPage: true });
    }
    await page.getByTestId('workbench-batch').click();
    await page.waitForFunction(() => location.pathname === '/workflow/batch-generation');
    await page.getByText('批量生成工作台', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, `${viewport.width}-batch.png`), fullPage: true });
    await page.getByRole('button', { name: '返回画布', exact: true }).click();
    await page.locator('.workflow-app-root .select-none.overflow-hidden').waitFor({ state: 'visible' });
    await page.getByTestId('workbench-tasks').click();
    await page.getByRole('dialog', { name: '任务', exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭任务', exact: true }).click();
    await page.getByRole('button', { name: '配置', exact: true }).last().click();
    await page.locator('.ant-modal').filter({ hasText: '配置' }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const modal = document.querySelector('.ant-modal');
      return modal && getComputedStyle(modal).opacity === '1' && !modal.closest('.ant-zoom-enter, .ant-zoom-appear');
    });
    await page.screenshot({ path: path.join(output, `${viewport.width}-config.png`), fullPage: true });
    await page.locator('.ant-modal-close').click();
    await page.locator('.ant-modal').waitFor({ state: 'hidden' });
    await page.locator('button[title="打开本地 Codex 面板"]').click();
    await page.locator('.workflow-agent-panel input').first().waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const panel = document.querySelector('.workflow-agent-panel');
      return panel && getComputedStyle(panel).opacity === '1' && panel.getBoundingClientRect().width > 0;
    });
    await page.screenshot({ path: path.join(output, `${viewport.width}-agent.png`), fullPage: true });
    await page.getByRole('button', { name: '收起 Agent 面板', exact: true }).click();
    await page.getByTestId('workbench-config').click();
    await page.getByTestId('settings-dialog').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(output, `${viewport.width}-shared-config.png`), fullPage: true });
    await page.locator('.winbox-settings-window .wb-close').click();
    await page.getByTestId('settings-dialog').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '旧版本', exact: true }).click();
    await page.locator('.drawnix').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(output, `${viewport.width}-legacy.png`), fullPage: true });
    if (errors.length) throw new Error(`Interaction errors: ${errors.join('; ')}`);
    await context.close();
  }
  const report = { label, conditions: 'Local production preview, uncompressed HTTP, fresh browser contexts, SW blocked, publisher session fixture, no paid requests', runs };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(runs.map(({ viewport, phase, homeMs, canvasMs, readyMs, resources, longTasks, errors }) => ({ width: viewport.width, phase, homeMs: homeMs === null ? null : Math.round(homeMs), canvasMs: Math.round(canvasMs), readyMs: Math.round(readyMs), requests: resources.length, bytes: resources.reduce((sum, e) => sum + e.bytes, 0), longTaskMs: Math.round(longTasks.reduce((sum, e) => sum + e.duration, 0)), errors })), null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
