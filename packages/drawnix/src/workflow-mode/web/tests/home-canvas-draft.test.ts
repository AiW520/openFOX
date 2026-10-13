import { describe, expect, it } from 'vitest';
import { defaultConfig, type AiConfig } from '../src/stores/use-config-store';
import { buildHomeCanvasDraft } from '../src/integration/home-canvas-draft';
import { getNativeParameterValues, nativeImageCount, singleImageConfig } from '../src/integration/native-parameters';

function config(): AiConfig {
    const model = {
        name: 'gpt-image-2', capability: 'image' as const,
        parameters: [
            { id: 'size', label: '图片尺寸', valueType: 'enum' as const, options: [{ value: 'auto', label: '自动' }, { value: '1024x1536', label: '竖图' }], defaultValue: 'auto' },
            { id: 'resolution', label: '分辨率', valueType: 'enum' as const, options: [{ value: '1k', label: '1K' }, { value: '2k', label: '2K' }], defaultValue: '1k' },
            { id: 'quality', label: '画质', valueType: 'enum' as const, options: [{ value: 'auto', label: '自动' }, { value: 'high', label: '高清' }], defaultValue: 'auto' },
            { id: 'n', label: '数量', valueType: 'number' as const, min: 1, max: 20, integer: true, defaultValue: 1 },
        ],
    };
    return {
        ...defaultConfig,
        channels: [
            { id: 'profile-a', name: 'Provider A', opentuProfileId: 'provider-a', baseUrl: '', apiKey: '', apiFormat: 'openai', models: [model] },
            { id: 'profile-b', name: 'Provider B', opentuProfileId: 'provider-b', baseUrl: '', apiKey: '', apiFormat: 'openai', models: [model] },
        ],
        models: ['profile-a::gpt-image-2', 'profile-b::gpt-image-2'],
    };
}

describe('homepage canvas draft', () => {
    it('preserves provider, prompt, every native selection, count, and idle status', () => {
        const draft = buildHomeCanvasDraft(config(), {
            generationType: 'image', prompt: 'Product photo',
            model: 'gpt-image-2', modelRef: { profileId: 'provider-b', modelId: 'gpt-image-2' },
            params: { size: '1024x1536', resolution: '2k', quality: 'high' }, count: 20,
        });
        expect(draft.type).toBe('image');
        expect(draft.metadata).toMatchObject({
            prompt: 'Product photo', content: undefined,
            model: 'profile-b::gpt-image-2', count: 20, status: 'idle',
        });
        expect(JSON.parse(draft.metadata.nativeParams!)).toEqual({
            'image::profile-b::gpt-image-2': {
                size: '1024x1536', resolution: '2k', quality: 'high', n: 20,
            },
        });
        const requestConfig = { ...config(), model: draft.metadata.model!, count: '20', nativeParams: draft.metadata.nativeParams };
        expect(getNativeParameterValues(requestConfig, requestConfig.model, 'image')).toEqual({
            size: '1024x1536', resolution: '2k', quality: 'high', n: 20,
        });
        expect(nativeImageCount(requestConfig)).toBe(20);
        expect(getNativeParameterValues(singleImageConfig(requestConfig), requestConfig.model, 'image').n).toBe(1);
    });

    it('does not substitute a same-name model from a different provider if the chosen provider disappeared', () => {
        const draft = buildHomeCanvasDraft(config(), {
            generationType: 'image', prompt: 'Draft', model: 'gpt-image-2',
            modelRef: { profileId: 'removed', modelId: 'gpt-image-2' },
        });
        expect(draft.metadata.model).toBe('opentu-native-removed::gpt-image-2');
        expect(draft.metadata.nativeParams).toBe('{}');
    });

    it('uses homepage duration, ratio, resolution and audio parameters for a video draft', () => {
        const videoConfig = config();
        videoConfig.channels[1].models.push({
            name: 'video-model', capability: 'video', parameters: [
                { id: 'duration', label: 'Duration', valueType: 'number', min: 4, max: 15, defaultValue: 6 },
                { id: 'size', label: 'Resolution', valueType: 'enum', options: [{ value: '1080p', label: '1080p' }] },
                { id: 'ratio', label: 'Ratio', valueType: 'enum', options: [{ value: '9:16', label: '9:16' }] },
                { id: 'generate_audio', label: 'Audio', valueType: 'enum', options: [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }] },
            ],
        });
        const draft = buildHomeCanvasDraft(videoConfig, {
            generationType: 'video', prompt: 'A camera move', model: 'video-model',
            modelRef: { profileId: 'provider-b', modelId: 'video-model' },
            params: { duration: '12', size: '1080p', ratio: '9:16', generate_audio: 'false' },
        });
        expect(draft.type).toBe('video');
        expect(draft.metadata.seconds).toBe('12');
        expect(getNativeParameterValues({ ...videoConfig, nativeParams: draft.metadata.nativeParams }, draft.metadata.model!, 'video')).toEqual({
            duration: 12, size: '1080p', ratio: '9:16', generate_audio: 'false',
        });
    });

    it('keeps agent drafts in a text node without treating the prompt as generated output', () => {
        const draft = buildHomeCanvasDraft(config(), {
            generationType: 'agent', prompt: 'Plan a campaign', model: 'gpt-5.5', count: 1,
        });
        expect(draft.type).toBe('text');
        expect(draft.metadata).toMatchObject({ prompt: 'Plan a campaign', content: undefined, status: 'idle', generationMode: 'text' });
    });
});
