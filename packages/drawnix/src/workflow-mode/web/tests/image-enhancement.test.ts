import { beforeEach, afterEach, expect, test, vi } from 'vitest';

const databases = vi.hoisted(() => new Map<string, Map<string, unknown>>());
vi.mock('localforage', () => ({ default: { createInstance: ({ storeName }: { storeName: string }) => {
    const data = databases.get(storeName) || new Map(); databases.set(storeName, data);
    return { getItem: async (key: string) => data.get(key) || null, setItem: async (key: string, value: unknown) => { data.set(key, structuredClone(value)); return value; } };
} } }));

beforeEach(() => { vi.resetModules(); databases.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test('cancelling during source loading persists cancellation and never submits', async () => {
    const client = await import('../../../services/image-enhancement');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    let resolveSource!: (blob: Blob) => void;
    const source = new Promise<Blob>(resolve => { resolveSource = resolve; });
    const ref = client.newEnhancement();
    const pending = client.trackEnhancement(ref, () => source);
    await Promise.resolve();
    await client.cancelEnhancement(ref);
    resolveSource(new Blob(['original']));
    await pending;
    expect(client.enhancementSnapshot(ref.requestId)?.status).toBe('cancelled');
    expect(fetchMock).not.toHaveBeenCalled();
    await client.trackEnhancement(ref, async () => { throw new Error('should not read source'); });
    expect(fetchMock).not.toHaveBeenCalled();
});

test('reloading a submitted job polls its existing ID and persists HD before completing', async () => {
    let client = await import('../../../services/image-enhancement');
    const ref = client.newEnhancement();
    databases.get('tasks')!.set(ref.requestId, { ...ref, task: { id: 'existing', status: 'processing' }, source: new Blob(['original']) });
    vi.resetModules(); client = await import('../../../services/image-enhancement');
    const fetchMock = vi.fn(async (url: string) => url.endsWith('/existing')
        ? Response.json({ id: 'existing', status: 'completed', width: 4096, height: 4096, resultUrl: '/result' })
        : new Response(new Blob(['hd'])));
    vi.stubGlobal('fetch', fetchMock);
    const pending = client.trackEnhancement(ref, async () => { throw new Error('must not resubmit'); });
    await vi.advanceTimersByTimeAsync(5000); await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.enhancementSnapshot(ref.requestId)).toMatchObject({ status: 'completed', width: 4096 });
    expect(await client.enhancementResult(ref.requestId)).toBeTruthy();
    expect(await client.enhancementOriginal(ref.requestId)).toBeTruthy();
});

test('a stale poll cannot overwrite successful cancellation', async () => {
    const client = await import('../../../services/image-enhancement');
    const ref = client.newEnhancement();
    databases.get('tasks')!.set(ref.requestId, { ...ref, task: { id: 'existing', status: 'processing' } });
    let finishPoll!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('/cancel')
        ? Promise.resolve(Response.json({ id: 'existing', status: 'cancelled' }))
        : new Promise<Response>(resolve => { finishPoll = resolve; })));
    const pending = client.trackEnhancement(ref, async () => new Blob());
    await vi.advanceTimersByTimeAsync(5000);
    await client.cancelEnhancement(ref);
    finishPoll(Response.json({ id: 'existing', status: 'processing' }));
    await pending;
    expect(client.enhancementSnapshot(ref.requestId)?.status).toBe('cancelled');
});

test('an idempotent submission already completed downloads HD before notifying completion', async () => {
    const client = await import('../../../services/image-enhancement');
    const ref = client.newEnhancement();
    const source = new Blob(['original']);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/result'
        ? new Response(new Blob(['hd']))
        : Response.json({ id: 'existing', status: 'completed', width: 4096, height: 4096, resultUrl: '/result' })));
    await client.trackEnhancement(ref, async () => source);
    expect(client.enhancementSnapshot(ref.requestId)?.status).toBe('completed');
    expect(await client.enhancementResult(ref.requestId)).toBeTruthy();
    expect(await client.enhancementOriginal(ref.requestId)).toBeTruthy();
});

test('a result download failure retains original and existing job for reconnect', async () => {
    const client = await import('../../../services/image-enhancement');
    const ref = client.newEnhancement();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/result'
        ? new Response('', { status: 503 })
        : Response.json({ id: 'existing', status: 'completed', resultUrl: '/result' })));
    await client.trackEnhancement(ref, async () => new Blob(['original']));
    expect(client.enhancementSnapshot(ref.requestId)).toMatchObject({ id: 'existing', status: 'encoding' });
    expect(await client.enhancementOriginal(ref.requestId)).toBeTruthy();
    expect(await client.enhancementResult(ref.requestId)).toBeNull();
    const fetchMock = vi.fn(async (url: string) => url === '/result'
        ? new Response(new Blob(['hd']))
        : Response.json({ id: 'existing', status: 'completed', resultUrl: '/result' }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = client.resumeEnhancement(ref);
    await vi.advanceTimersByTimeAsync(5000); await pending;
    expect(fetchMock.mock.calls.every(([url]) => url === '/result' || url.endsWith('/existing'))).toBe(true);
    expect(client.enhancementSnapshot(ref.requestId)?.status).toBe('completed');
});
