import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '../runtime-helpers';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
describe('clipboard fallback', () => {
  it('uses the browser clipboard when permitted', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyToClipboard('content');
    expect(writeText).toHaveBeenCalledWith('content');
    expect(document.querySelector('textarea')).toBeNull();
  });
  it.each([false, true])('cleans up and preserves focus when fallback succeeds=%s', async success => {
    vi.stubGlobal('navigator', {});
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => success) });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    if (success) await copyToClipboard('content');
    else await expect(copyToClipboard('content')).rejects.toThrow('复制失败');
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
