// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntryTransition } from './use-entry-transition';

afterEach(cleanup);

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('entry transitions', () => {
  it('keeps the active destination until its replacement has loaded', async () => {
    const entry = deferred();
    const commit = vi.fn();
    const { result } = renderHook(() => useEntryTransition(() => entry.promise));
    let navigation!: Promise<void>;
    act(() => { navigation = result.current.navigate('new', commit); });
    expect(result.current.pending).toBe('new');
    expect(commit).not.toHaveBeenCalled();
    await act(async () => { entry.resolve(); await navigation; });
    expect(commit).toHaveBeenCalledOnce();
    expect(result.current.pending).toBeNull();
  });

  it('ignores late failure from superseded navigation', async () => {
    const old = deferred();
    const home = deferred();
    const commitOld = vi.fn();
    const commitHome = vi.fn();
    const { result } = renderHook(() => useEntryTransition((target) => target === 'home' ? home.promise : old.promise));
    let first!: Promise<void>, second!: Promise<void>;
    act(() => { first = result.current.navigate('new', commitOld); });
    act(() => { second = result.current.navigate('home', commitHome); });
    await act(async () => { home.resolve(); await second; old.reject(Error('offline')); await first; });
    expect(commitHome).toHaveBeenCalledOnce();
    expect(commitOld).not.toHaveBeenCalled();
    expect(result.current.failed).toBeNull();
  });

  it('does not commit an earlier success while a later destination is still loading', async () => {
    const old = deferred();
    const home = deferred();
    const commitOld = vi.fn();
    const commitHome = vi.fn();
    const { result } = renderHook(() => useEntryTransition((target) => target === 'home' ? home.promise : old.promise));
    let first!: Promise<void>, second!: Promise<void>;
    act(() => { first = result.current.navigate('new', commitOld); });
    act(() => { second = result.current.navigate('home', commitHome); });
    await act(async () => { old.resolve(); await first; });
    expect(commitOld).not.toHaveBeenCalled();
    expect(result.current.pending).toBe('home');
    await act(async () => { home.resolve(); await second; });
    expect(commitHome).toHaveBeenCalledOnce();
  });

  it('cancels a pending request on a history or selection change', async () => {
    const entry = deferred();
    const commit = vi.fn();
    const { result } = renderHook(() => useEntryTransition(() => entry.promise));
    let navigation!: Promise<void>;
    act(() => { navigation = result.current.navigate('new', commit); });
    act(() => result.current.cancel());
    await act(async () => { entry.resolve(); await navigation; });
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.pending).toBeNull();
  });

  it('keeps the document on failure and permits an explicit retry', async () => {
    const load = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined);
    const commit = vi.fn();
    const { result } = renderHook(() => useEntryTransition(load));
    await act(async () => { await result.current.navigate('legacy', commit); });
    expect(result.current.failed).toBe('legacy');
    expect(commit).not.toHaveBeenCalled();
    await act(async () => { await result.current.navigate('legacy', commit); });
    expect(result.current.failed).toBeNull();
    expect(commit).toHaveBeenCalledOnce();
  });

  it('does not commit a navigation after the app has unmounted', async () => {
    const entry = deferred();
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useEntryTransition(() => entry.promise));
    let navigation!: Promise<void>;
    act(() => { navigation = result.current.navigate('new', commit); });
    unmount();
    entry.resolve();
    await navigation;
    expect(commit).not.toHaveBeenCalled();
  });
});
