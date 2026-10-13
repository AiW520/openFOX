import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readNativeModels } from '../../host/native-models';
import { syncOpenTuModels } from '../src/integration/opentu-model-defaults';
import { configuredChannelsOnly, defaultConfig, useConfigStore, type ModelChannel } from '../src/stores/use-config-store';

vi.mock('../../host/native-models', () => ({ readNativeModels: vi.fn() }));
const host: ModelChannel = {
    id: 'opentu-native-p', name: 'Shared provider', opentuProfileId: 'p',
    baseUrl: '', apiKey: '', apiFormat: 'openai',
    models: [{ name: 'image', capability: 'image' }, { name: 'text', capability: 'text' }],
};
const catalog = {
    channels: [host],
    defaults: { image: `${host.id}::image`, text: `${host.id}::text`, video: '', audio: '' },
};
beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readNativeModels).mockResolvedValue(catalog);
    useConfigStore.setState({ config: { ...defaultConfig, channels: [], apiKey: 'old-copy', systemPrompt: 'keep' }, sharedSettingsReady: false });
});

describe('shared workflow model sources', () => {
    it('imports shared providers and defaults without duplicating credentials', async () => {
        await syncOpenTuModels();
        expect(readNativeModels).toHaveBeenCalledOnce();
        expect(useConfigStore.getState().config).toMatchObject({
            channels: [host], apiKey: '', imageModel: catalog.defaults.image,
            textModel: catalog.defaults.text, systemPrompt: 'keep',
        });
        expect(useConfigStore.getState().sharedSettingsReady).toBe(true);
    });

    it('removes providers deleted from the shared settings and remains idempotent', async () => {
        await syncOpenTuModels();
        vi.mocked(readNativeModels).mockResolvedValue({ channels: [], defaults: { image: '', text: '', video: '', audio: '' } });
        await syncOpenTuModels();
        const first = useConfigStore.getState().config;
        expect(first.channels).toEqual([]);
        expect(first.imageModel).toBe('');
        await syncOpenTuModels();
        expect(useConfigStore.getState().config).toBe(first);
    });

    it('keeps shared provider references and clears a deleted local model', () => {
        const config = configuredChannelsOnly({ ...defaultConfig, channels: [host], imageModel: catalog.defaults.image, videoModel: 'deleted::video' });
        expect(config.imageModel).toBe(catalog.defaults.image);
        expect(config.videoModel).toBe('');
    });

    it('does not persist a second supplier catalog or credential copy', async () => {
        await syncOpenTuModels();
        const persist = useConfigStore.persist.getOptions().partialize!;
        expect(persist(useConfigStore.getState()).config).toMatchObject({ channels: [], models: [], apiKey: '' });
    });

    it('does not mutate after the caller becomes inactive', async () => {
        const original = useConfigStore.getState().config;
        await syncOpenTuModels(() => false);
        expect(useConfigStore.getState().config).toBe(original);
    });
});
