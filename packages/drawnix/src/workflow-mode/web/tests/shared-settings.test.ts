import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    read: vi.fn(),
    initialize: vi.fn(),
    write: vi.fn(),
    set: vi.fn(),
    state: { config: {} as Record<string, unknown> },
}));

vi.mock('../../../utils/settings-manager', () => ({
    settingsManager: { waitForInitialization: mocks.initialize },
    updateActiveInvocationRouteModel: mocks.write,
}));
vi.mock('../../host/native-models', () => ({ readNativeModels: mocks.read }));
vi.mock('../src/stores/use-config-store', () => ({
    useConfigStore: { getState: () => mocks.state, setState: mocks.set },
    modelOptionsFromChannels: (channels: Array<{ id: string; models: Array<{ name: string }> }>) =>
        channels.flatMap(channel => channel.models.map(model => `${channel.id}::${model.name}`)),
    decodeChannelModel: (value: string) => {
        const [channelId, model] = value.split('::');
        return model ? { channelId, model } : null;
    },
}));

import { refreshSharedSettings, writeSharedDefault } from '../src/integration/shared-settings';

function catalog(model: string) {
    return {
        channels: [{ id: 'shared', opentuProfileId: 'provider', apiKey: '', models: [{ name: model }] }],
        defaults: { image: `shared::${model}`, video: '', text: '', audio: '' },
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.initialize.mockResolvedValue(undefined);
    mocks.state.config = { channels: [], apiKey: 'stale-key', imageSize: '1024x1024' };
    mocks.set.mockImplementation((next: typeof mocks.state) => { mocks.state = next; });
});

describe('shared canvas settings', () => {
    it('refreshes native providers and defaults while preserving canvas options and removing key copies', async () => {
        mocks.read.mockResolvedValue(catalog('latest'));
        await refreshSharedSettings();
        expect(mocks.state.config).toMatchObject({
            channels: catalog('latest').channels,
            models: ['shared::latest'], imageModel: 'shared::latest', model: 'shared::latest',
            apiKey: '', imageSize: '1024x1024',
        });
    });

    it('writes workflow model choices back to the shared provider route', async () => {
        mocks.state.config = { channels: catalog('latest').channels };
        await writeSharedDefault('imageModel', 'shared::latest');
        expect(mocks.initialize).toHaveBeenCalledOnce();
        expect(mocks.write).toHaveBeenCalledWith('image', { profileId: 'provider', modelId: 'latest' });
        mocks.state.config = { channels: [{ id: 'legacy', opentuProfileId: null }] };
        await writeSharedDefault('textModel', 'legacy::text');
        expect(mocks.write).toHaveBeenLastCalledWith('text', { profileId: null, modelId: 'text' });
    });

    it('ignores canvas preferences, invalid model values and channels without a shared provider', async () => {
        await writeSharedDefault('imageSize', '1024x1024');
        await writeSharedDefault('imageModel', 'invalid');
        await writeSharedDefault('imageModel', 'missing::model');
        expect(mocks.write).not.toHaveBeenCalled();
    });

    it('discards older refreshes and results for an unmounted canvas', async () => {
        let finish!: (value: ReturnType<typeof catalog>) => void;
        mocks.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const earlier = refreshSharedSettings();
        mocks.read.mockResolvedValue(catalog('newer'));
        await refreshSharedSettings();
        finish(catalog('older'));
        await earlier;
        expect(mocks.state.config.imageModel).toBe('shared::newer');
        mocks.set.mockClear();
        await refreshSharedSettings(() => false);
        expect(mocks.set).not.toHaveBeenCalled();
    });
});
