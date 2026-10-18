import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocalStorageUsage } from '@/services/local-storage-usage';

afterEach(() => vi.unstubAllGlobals());
function database() {
    const close = vi.fn();
    vi.stubGlobal('indexedDB', { open: () => {
        const request = { result: { objectStoreNames: [], version: 3, close }, onsuccess: undefined as undefined | (() => void) };
        queueMicrotask(() => request.onsuccess?.());
        return request;
    } });
    return close;
}
describe('storage quota fallback', () => {
    it.each([undefined, { estimate: () => Promise.reject(new Error('denied')) }])('still reads content when estimation is unavailable', async storage => {
        const close = database();
        vi.stubGlobal('navigator', { storage });
        const usage = await readLocalStorageUsage();
        expect(usage).toMatchObject({ quota: null, usage: null, contentBytes: 0, databases: [{ version: 3 }] });
        expect(close).toHaveBeenCalledOnce();
    });
    it('keeps available site estimates', async () => {
        database();
        vi.stubGlobal('navigator', { storage: { estimate: async () => ({ usage: 500, quota: 1000 }) } });
        expect(await readLocalStorageUsage()).toMatchObject({ usage: 500, quota: 1000, contentBytes: 0 });
    });
});
