import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const origin = process.env.PUBLISHER_QA_URL || 'https://op.47.107.92.13.nip.io';
const access = await readFile('.env.publisher-access', 'utf8');
const secret = access.match(/^TEST_ACCESS_CODE=(.+)$/m)?.[1].trim();
assert(secret, 'Missing local trial code');
const health = await fetch(`${origin}/api/publisher/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);
assert.equal((await fetch(`${origin}/api/publisher/session`)).status, 401);

const index = await (await fetch(`${origin}/workflow/canvas/release-check`)).text();
const script = index.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
assert(script, 'Deep link must use root-relative assets');
assert.equal((await fetch(`${origin}${script}`)).status, 200);
assert(index.includes("register('/sw.js')"));

const output = path.resolve('tmp/mobile-workbench-online');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const errors = [];
    const failedAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
        if (response.url().startsWith(`${origin}/assets/`) && response.status() >= 400) failedAssets.push(response.status());
    });
    await page.route('**/*', route => {
        const req = route.request();
        if (new URL(req.url()).origin !== origin) return route.abort();
        if (req.method() !== 'GET' && !req.url().endsWith('/api/publisher/login')) return route.abort();
        return route.continue();
    });
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('体验码', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'trial.png') });
    await page.getByLabel('体验码', { exact: true }).fill(secret);
    await page.getByRole('button', { name: '使用平台模型', exact: true }).click();
    await page.getByRole('button', { name: '打开画布', exact: true }).waitFor();
    const sessionResponse = await context.request.get(`${origin}/api/publisher/session`);
    assert.equal(sessionResponse.status(), 200);
    const session = await sessionResponse.json();
    assert.equal(session.enabled, true);
    assert(session.models?.length > 0, 'Shared catalog is empty');
    const sessionText = JSON.stringify(session);
    assert(!/"(?:apiKey|api_key|secret|password)"\s*:/i.test(sessionText), 'Public response exposes a credential field');
    assert.equal(await page.locator('.new-experience--compact').count(), 1);
    await page.getByRole('textbox', { name: '创作描述' }).fill('Mobile release validation');
    await page.screenshot({ path: path.join(output, 'home.png'), fullPage: true });
    await page.getByRole('button', { name: '打开画布', exact: true }).click();
    await page.locator('.workflow-mobile-node-editor').waitFor();
    await page.locator('[contenteditable="true"]').filter({ hasText: 'Mobile release validation' }).waitFor();
    if (session.models.some(model => model.id.toLowerCase() === 'gpt-image-2.5')) {
        assert((await page.locator('.workflow-node-prompt-panel').innerText()).toLowerCase().includes('gpt-image-2.5'));
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(output, 'canvas-editor.png') });
    await page.locator('.workflow-mobile-node-editor .ant-drawer-close').click();
    const canvasPath = new URL(page.url()).pathname;
    const nodeCount = await page.locator('.node-element').count();
    await page.getByRole('button', { name: '自由画布', exact: true }).click();
    await page.locator('.drawnix').waitFor();
    await page.getByRole('button', { name: '工作流画布', exact: true }).click();
    await page.locator('.workflow-canvas-page').waitFor();
    assert.equal(new URL(page.url()).pathname, canvasPath);
    assert.equal(await page.locator('.node-element').count(), nodeCount);
    assert.equal(await page.locator('.new-experience').count(), 0);
    await page.locator('.new-canvas-host__brand').click();
    await page.getByRole('button', { name: '打开画布', exact: true }).waitFor();
    await page.getByRole('button', { name: '自由画布', exact: true }).click();
    await page.getByRole('textbox', { name: '创作描述' }).fill('Free canvas release validation');
    await page.getByRole('button', { name: '打开画布', exact: true }).click();
    await page.locator('.drawnix [contenteditable="true"], .drawnix textarea').filter({ hasText: 'Free canvas release validation' }).first().waitFor();
    await page.screenshot({ path: path.join(output, 'free-canvas.png') });
    assert.deepEqual(errors, []);
    assert.deepEqual(failedAssets, []);
    const report = { origin, health: true, realTrialLogin: true, sharedModels: session.models.length, mobileCanvas: true, freeCanvas: true, restoredWorkflow: true, paidGeneration: false, errors, failedAssets };
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    await context.close();
} finally {
    await browser.close();
}
