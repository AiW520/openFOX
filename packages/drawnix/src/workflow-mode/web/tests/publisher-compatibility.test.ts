import 'fake-indexeddb/auto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mergePublisherSettings, removePublisherSettings } from '../../../../../../apps/web/src/app/publisher-settings';
import { getStaticModelConfig } from '../../../constants/model-config';
import { settingsManager, createModelRef, createRouteConfig, resolveInvocationRoute } from '../../../utils/settings-manager';
import { getAdapterContextFromSettings, resolveAdapterForInvocation } from '../../../services/model-adapters';
import { PUBLISHER_CREDENTIAL_MARKER } from '../../../services/publisher-transport';
import { readNativeModels } from '../../host/native-models';
import { generateNative } from '../../host/native-generation';
import { refreshSharedSettings, writeSharedDefault } from '../src/integration/shared-settings';
import { useConfigStore } from '../src/stores/use-config-store';

const sharedId = 'publisher-shared';
const profile = {
    id: sharedId, name: 'Shared', baseUrl: 'https://api.tu-zi.com/coding/v1',
    apiKey: PUBLISHER_CREDENTIAL_MARKER, providerType: 'openai-compatible' as const,
    authType: 'bearer' as const, enabled: true, imageApiCompatibility: 'tuzi-gpt-image' as const,
    preferAsyncImageEndpoint: false,
    capabilities: { supportsModelsEndpoint: true, supportsText: true, supportsImage: true, supportsVideo: true, supportsAudio: true, supportsTools: true },
};
const sharedCatalog = {
    profileId: sharedId, discoveredAt: 1,
    discoveredModels: ['gpt-image-2', 'gpt-image-2.5', 'gpt-6-sol', 'gpt-6-luna'].map(id => getStaticModelConfig(id)!),
    selectedModelIds: ['gpt-image-2', 'gpt-image-2.5', 'gpt-6-sol', 'gpt-6-luna'],
};
const preset = {
    id: 'publisher-default', name: 'Trial',
    image: createRouteConfig(createModelRef(sharedId, 'gpt-image-2')),
    text: createRouteConfig(createModelRef(sharedId, 'gpt-6-sol')),
    video: createRouteConfig(), audio: createRouteConfig(),
};

beforeAll(async () => {
    await settingsManager.waitForInitialization();
    const settings = settingsManager.getSettings();
    await settingsManager.updateSettings(mergePublisherSettings(settings, profile, sharedCatalog, preset, true));
});
afterEach(() => vi.unstubAllGlobals());

describe('publisher models across both canvases', () => {
    it('always uses GPT Image 2.5 as the publisher image default', () => {
        const stalePreset = {
            ...preset,
            image: createRouteConfig(createModelRef(sharedId, 'api-images-seededit')),
        };
        const merged = mergePublisherSettings(settingsManager.getSettings(), profile, {
            ...sharedCatalog,
            discoveredModels: [
                ...sharedCatalog.discoveredModels,
                getStaticModelConfig('gpt-image-2.5')!,
                { ...getStaticModelConfig('api-images-seededit')!, id: 'api-images-seededit', type: 'image' },
            ],
            selectedModelIds: [...sharedCatalog.selectedModelIds, 'gpt-image-2.5', 'api-images-seededit'],
        }, {
            ...stalePreset,
            image: createRouteConfig(createModelRef(sharedId, 'gpt-image-2.5')),
        });
        expect(merged.invocationPresets?.find(item => item.id === 'publisher-default')?.image?.defaultModelRef).toEqual({
            profileId: sharedId,
            modelId: 'gpt-image-2.5',
        });
    });

    it('uses the same provider and parameters in the legacy route and workflow catalog without copying credentials', async () => {
        const legacy = resolveInvocationRoute('image');
        expect(legacy).toMatchObject({ profileId: sharedId, modelId: 'gpt-image-2.5', apiKey: PUBLISHER_CREDENTIAL_MARKER });
        const catalog = await readNativeModels();
        const channel = catalog.channels.find(item => item.opentuProfileId === sharedId)!;
        expect(channel.apiKey).toBe('');
        expect(catalog.defaults.image).toBe(`${channel.id}::gpt-image-2.5`);
        expect(channel.models.find(item => item.name === 'gpt-image-2')?.unavailableReason).toBeUndefined();
        await refreshSharedSettings();
        expect(useConfigStore.getState().config.imageModel).toBe(catalog.defaults.image);
    });

    it('submits GPT Image 2.5 from the shared canvas default without a model selection', async () => {
        const fetcher = vi.fn(async () => Response.json({ data: [{ url: 'https://result.example/default.png', width: 1024, height: 1024 }] }));
        vi.stubGlobal('fetch', fetcher);
        await refreshSharedSettings();
        const [channelId, model] = useConfigStore.getState().config.imageModel.split('::');
        await generateNative({ capability: 'image', channelId, model, prompt: 'Default image', images: [] }, new AbortController().signal);
        expect(JSON.parse((fetcher.mock.calls as unknown as [string, RequestInit][])[0][1].body as string).model).toBe('gpt-image-2.5');
    }, 15000);

    it('routes legacy and workflow image calls through the publisher proxy with matching parameters', async () => {
        const fetcher = vi.fn(async () => Response.json({ data: [{ url: 'https://result.example/image.png', width: 1024, height: 1536 }] }));
        vi.stubGlobal('fetch', fetcher);
        const modelRef = createModelRef(sharedId, 'gpt-image-2')!;
        const adapter = resolveAdapterForInvocation('image', 'gpt-image-2', modelRef)!;
        if (adapter.kind !== 'image') throw new Error('Expected image adapter');
        await adapter.generateImage(getAdapterContextFromSettings('image', modelRef), {
            model: 'gpt-image-2', modelRef, prompt: 'Legacy draft', size: '2x3',
            params: { resolution: '1k', quality: 'high', n: 1 },
        });
        await generateNative({
            capability: 'image', channelId: `opentu-native-${sharedId}`, model: 'gpt-image-2',
            prompt: 'Workflow draft', images: [], params: { size: '2x3', resolution: '1k', quality: 'high', n: 1 },
        }, new AbortController().signal);
        expect(fetcher).toHaveBeenCalledTimes(2);
        const bodies: Record<string, unknown>[] = [];
        for (const [url, init] of fetcher.mock.calls as unknown as [string, RequestInit][]) {
            const target = new URL(url);
            expect(target.pathname).toBe('/api/publisher/proxy');
            expect(target.searchParams.get('path')).toBe('/coding/v1/images/generations');
            expect(new Headers(init.headers).has('Authorization')).toBe(false);
            expect(init.credentials).toBe('same-origin');
            const body = JSON.parse(init.body as string);
            expect(body).toMatchObject({ model: 'gpt-image-2', quality: 'high' });
            bodies.push(body);
        }
        expect(bodies[0].size).toBe(bodies[1].size);
        expect(bodies[0].size).toBe('832x1248');
    }, 15000);

    it('keeps workflow default model changes after shared configuration refresh and removes the trial cleanly', async () => {
        await refreshSharedSettings();
        await writeSharedDefault('textModel', `opentu-native-${sharedId}::gpt-6-luna`);
        expect(resolveInvocationRoute('text').modelId).toBe('gpt-6-luna');
        await settingsManager.updateSettings(mergePublisherSettings(settingsManager.getSettings(), profile, sharedCatalog, preset));
        await refreshSharedSettings();
        expect(resolveInvocationRoute('text').modelId).toBe('gpt-6-luna');
        expect(useConfigStore.getState().config.textModel).toBe(`opentu-native-${sharedId}::gpt-6-luna`);
        await settingsManager.updateSettings(removePublisherSettings(settingsManager.getSettings()));
        await refreshSharedSettings();
        expect(useConfigStore.getState().config.channels.some(item => item.opentuProfileId === sharedId)).toBe(false);
    });
});
