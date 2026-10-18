import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCachedLoader, scheduleIdlePreload } from './cached-loader';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('entry loading', () => {
  it('shares pending and fulfilled loads between preloading and rendering', async () => {
    let resolve!: (value: string) => void;
    const importModule = vi.fn(() => new Promise<string>((done) => { resolve = done; }));
    const load = createCachedLoader(importModule);
    const intent = load();
    expect(load()).toBe(intent);
    await Promise.resolve();
    resolve('module');
    await expect(intent).resolves.toBe('module');
    expect(load()).toBe(intent);
    expect(importModule).toHaveBeenCalledOnce();
  });

  it('allows retry after a rejected speculative load', async () => {
    const importModule = vi.fn().mockRejectedValueOnce(Error('network')).mockResolvedValue('recovered');
    const load = createCachedLoader(importModule);
    await expect(load()).rejects.toThrow('network');
    await expect(load()).resolves.toBe('recovered');
    expect(importModule).toHaveBeenCalledTimes(2);
  });

  it.each([{ saveData: true }, { effectiveType: 'slow-2g' }, { effectiveType: '2g' }])(
    'skips idle imports on constrained connections: %j', async (connection) => {
      vi.useFakeTimers();
      vi.stubGlobal('navigator', { connection });
      const load = vi.fn().mockResolvedValue(undefined);
      scheduleIdlePreload(load);
      await vi.runAllTimersAsync();
      expect(load).not.toHaveBeenCalled();
    }
  );

  it('cancels a pending idle callback when the selected entry changes', () => {
    const cancel = vi.fn();
    vi.stubGlobal('requestIdleCallback', vi.fn(() => 7));
    vi.stubGlobal('cancelIdleCallback', cancel);
    const load = vi.fn().mockResolvedValue(undefined);
    scheduleIdlePreload(load)();
    expect(cancel).toHaveBeenCalledWith(7);
    expect(load).not.toHaveBeenCalled();
  });

  it('handles idle-load failure without an unhandled rejection', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const load = vi.fn().mockRejectedValue(Error('offline'));
    scheduleIdlePreload(load);
    await vi.runAllTimersAsync();
    expect(load).toHaveBeenCalledOnce();
  });

  it('does not start background work while the document is hidden', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const load = vi.fn().mockResolvedValue(undefined);
    scheduleIdlePreload(load);
    await vi.runAllTimersAsync();
    expect(load).not.toHaveBeenCalled();
  });
});
