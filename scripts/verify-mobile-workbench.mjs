import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve('dist/apps/web');
const output = path.resolve('tmp/mobile-workbench');
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let file = path.resolve(root, `.${pathname}`);
        if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
        if (!(await stat(file).catch(() => null))?.isFile()) {
            if (path.extname(pathname)) { res.writeHead(404).end(); return; }
            file = path.join(root, 'index.html');
        }
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.end(await readFile(file));
    } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = process.env.MOBILE_QA_URL || `http://127.0.0.1:${server.address().port}`;
let browser;
const reports = [];
try {
    browser = await chromium.launch({ headless: true });
    for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
        const mobile = viewport.width < 1000;
        const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        let authorized = viewport.width !== 360;
        await page.route('**/api/publisher/session', route => authorized ? route.fulfill({ json: {
            enabled: true, name: 'Mobile QA', baseUrl: 'https://api.tu-zi.com/v1',
            models: [{ id: 'gpt-image-2.5', label: 'GPT-image-2.5', type: 'image' }],
        } }) : route.fulfill({ status: 401, json: {} }));
        await page.route('**/*', route => {
            if (new URL(route.request().url()).origin !== origin || route.request().method() !== 'GET') return route.abort();
            return route.fallback();
        });
        await page.route('**/api/publisher/login', route => {
            assert.deepEqual(route.request().postDataJSON(), { role: 'tester', secret: 'qa-code' });
            authorized = true;
            return route.fulfill({ json: { ok: true } });
        });
        const shot = async name => {
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(output, `${viewport.width}-${name}.png`), fullPage: name !== 'trial' });
            console.log(`${viewport.width}: ${name}`);
        };
        try {
            await page.goto(`${origin}/?${mobile ? '' : 'experience=new&'}sw=0`, { waitUntil: 'domcontentloaded' });
            if (viewport.width === 360) {
                await page.getByLabel('体验码', { exact: true }).waitFor();
                await shot('trial');
                await page.getByLabel('体验码', { exact: true }).fill('qa-code');
                await page.getByRole('button', { name: '使用平台模型', exact: true }).click();
            }
            await page.getByRole('button', { name: '打开画布', exact: true }).waitFor();
            assert.equal(await page.locator('.new-experience--compact').count(), mobile ? 1 : 0);
            await page.getByRole('textbox', { name: '创作描述' }).fill('Mobile QA draft');
            await shot('home');
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'home overflows horizontally');
            await page.getByRole('button', { name: '打开画布', exact: true }).click();
            await page.locator('.workflow-canvas-page').waitFor();
            await page.locator('[contenteditable="true"]').filter({ hasText: 'Mobile QA draft' }).waitFor();
            if (mobile) await page.locator('.workflow-mobile-node-editor').waitFor();
            await shot('editor');
            if (mobile) {
                await page.locator('.workflow-node-prompt-panel .ant-btn-primary').scrollIntoViewIfNeeded();
                await shot('editor-controls');
                const editorButton = await page.locator('.workflow-node-prompt-panel .ant-btn-primary').boundingBox();
                assert(editorButton && editorButton.y >= 0 && editorButton.y + editorButton.height <= viewport.height + 1, 'generate button cannot be reached');
            }
            if (await page.locator('.publisher-logout').count()) {
                assert((await page.locator('.workflow-node-prompt-panel').innerText()).toLowerCase().includes('gpt-image-2.5'), 'publisher model did not carry to canvas');
            }
            if (mobile) {
                await page.locator('.workflow-mobile-node-editor .ant-drawer-close').click();
                await page.waitForTimeout(600);
                await page.locator('.workflow-mobile-dock button').first().click();
                await page.locator('.workflow-mobile-tool-grid').waitFor();
                await shot('add');
                await page.locator('.workflow-mobile-tool-grid').getByRole('button', { name: '图片', exact: true }).click();
                await page.locator('.workflow-mobile-dock').waitFor();
                await page.waitForTimeout(600);
                await page.locator('.workflow-mobile-node-editor .ant-drawer-close').click();
                await page.waitForTimeout(600);
                const node = page.locator('.node-element').last();
                const before = await node.getAttribute('style');
                const rect = await node.boundingBox();
                const finger = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id: 10 };
                const touch = await context.newCDPSession(page);
                await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
                await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...finger, x: finger.x + 35, y: finger.y + 25 }] });
                await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await page.waitForTimeout(100);
                assert.notEqual(await node.getAttribute('style'), before, 'touch drag did not move the node');
                const canvas = page.locator('.workflow-canvas-page .relative.h-full.w-full.select-none.overflow-hidden');
                const world = canvas.locator(':scope > .absolute.origin-top-left');
                const transform = await world.getAttribute('style');
                const canvasRect = await canvas.boundingBox();
                const fingers = [{ x: 15, y: canvasRect.y + 65, id: 20 }, { x: viewport.width - 15, y: canvasRect.y + 65, id: 21 }];
                await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers });
                await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...fingers[0], x: 65 }, fingers[1]] });
                await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await touch.detach();
                await page.waitForTimeout(100);
                assert.notEqual(await world.getAttribute('style'), transform, 'pinch did not change viewport');
                await page.locator('.workflow-mobile-canvas-topbar > button').first().click();
                await page.locator('.workflow-mobile-resources').waitFor();
                await shot('resources');
                await page.locator('.workflow-mobile-resources .ant-drawer-close').click();
                await page.waitForTimeout(600);
            }
            await shot('canvas');
            await page.getByTestId('workbench-tasks').click();
            await page.getByRole('dialog', { name: '任务', exact: true }).waitFor();
            await shot('tasks');
            await page.getByRole('button', { name: '关闭任务', exact: true }).click();
            await page.getByTestId('workbench-config').click();
            await page.getByTestId('settings-dialog').waitFor();
            await shot('config');
            if (mobile) {
                const action = page.getByRole('button', { name: '新增供应商', exact: true });
                const rect = await action.boundingBox();
                assert(rect && rect.x >= 0 && rect.x + rect.width <= viewport.width + 1, 'provider add button overflows');
            }
            await page.locator('.winbox-settings-window .wb-close').click();
            await page.getByTestId('settings-dialog').waitFor({ state: 'hidden' });
            await page.getByTestId('workbench-batch').click();
            await page.getByText('批量生成工作台', { exact: true }).waitFor();
            await shot('batch');
            await page.getByRole('button', { name: '返回画布', exact: true }).click();
            await page.locator('.workflow-canvas-page').waitFor();
            const expectedCanvasPath = new URL(page.url()).pathname;
            const expectedNodes = await page.locator('.node-element').count();
            await page.getByRole('button', { name: '旧版本', exact: true }).click();
            await page.locator('.drawnix').waitFor();
            await shot('legacy');
            const canvasPath = new URL(await page.evaluate(() => {
                const board = new URLSearchParams(location.search).get('board') || 'default';
                return sessionStorage.getItem('opentu_new_location_v1:' + board);
            }), origin).pathname;
            assert.equal(canvasPath, expectedCanvasPath);
            for (let i = 0; i < 2; i++) {
                if (i === 1) await page.reload({ waitUntil: 'domcontentloaded' });
                await page.getByRole('button', { name: '新版本', exact: true }).click();
                await page.locator('.workflow-canvas-page').waitFor();
                assert.equal(new URL(page.url()).pathname, canvasPath, 'version switch restored a different canvas');
                assert.equal(await page.locator('.node-element').count(), expectedNodes, 'version switch lost canvas nodes');
                assert.equal(await page.locator('.new-experience').count(), 0, 'version switch returned to home');
                await page.getByRole('button', { name: '旧版本', exact: true }).click();
                await page.locator('.drawnix').waitFor();
            }
            await page.getByRole('button', { name: '新版本', exact: true }).click();
            await page.locator('.workflow-canvas-page').waitFor();
            await page.locator('.new-canvas-host__brand').click();
            await page.getByRole('button', { name: '打开画布', exact: true }).waitFor();
            await page.getByRole('button', { name: '旧版本', exact: true }).click();
            await page.locator('.drawnix').waitFor();
            await page.getByRole('button', { name: '新版本', exact: true }).click();
            await page.getByRole('button', { name: '打开画布', exact: true }).waitFor();
            assert.deepEqual(errors, []);
            reports.push({ viewport, mobile, errors, passed: true });
        } catch (error) {
            await shot('failure');
            console.error(await page.locator('body').innerText(), errors);
            throw error;
        } finally { await context.close(); }
    }
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ conditions: 'Local build, fixture publisher session, generation blocked, no paid API calls', reports }, null, 2));
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
