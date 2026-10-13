import type { AIInputPrefillEventDetail } from '../../../../services/ai-input-ui-events';
import { encodeChannelModel, resolveModelForCapability, type AiConfig, type ModelCapability } from '../stores/use-config-store';
import { CanvasNodeType, type CanvasNodeMetadata } from '../types/canvas';
import { effectiveNativeParameters } from '../../../shared/native-parameters';
import { nativeModel, setNativeParameterValue } from './native-parameters';

export function buildHomeCanvasDraft(config: AiConfig, detail: AIInputPrefillEventDetail) {
    const capability: ModelCapability = detail.generationType === 'agent' ? 'text' : detail.generationType;
    const name = detail.modelRef?.modelId || detail.model;
    const channel = detail.modelRef && config.channels.find(item =>
        item.opentuProfileId === detail.modelRef!.profileId &&
        item.models.some(model => model.name === name && model.capability === capability));
    // Preserve a missing provider selection rather than rerouting to another account.
    const model = detail.modelRef
        ? encodeChannelModel(channel ? channel.id : `opentu-native-${detail.modelRef.profileId ?? 'legacy'}`, name || '')
        : resolveModelForCapability(config, name || config[`${capability}Model`], capability);
    const params = detail.params || {};
    let draftConfig = { ...config, model, nativeParams: '{}' };
    const entry = nativeModel(draftConfig, capability, model);
    for (const parameter of effectiveNativeParameters(entry?.parameters || [], params)) {
        const value = params[parameter.id];
        if (value !== undefined && !parameter.disabledReason)
            draftConfig = { ...draftConfig, nativeParams: setNativeParameterValue(draftConfig, model, capability, parameter.id, value) };
    }
    const count = Math.max(1, Math.min(20, Math.floor(detail.count || 1)));
    if (capability === 'image') {
        const quantity = entry?.parameters?.find(parameter => ['n', 'count'].includes(parameter.id) && !parameter.disabledReason);
        if (quantity) draftConfig = { ...draftConfig, nativeParams: setNativeParameterValue(draftConfig, model, capability, quantity.id, count) };
    }
    const metadata: CanvasNodeMetadata = {
        prompt: detail.prompt,
        content: undefined,
        generationMode: capability,
        generationType: 'generation',
        model,
        nativeParams: draftConfig.nativeParams,
        size: params.size,
        quality: params.quality,
        background: params.background,
        count,
        seconds: params.duration || params.seconds,
        vquality: params.vquality,
        references: detail.images?.map(image => image.url),
        status: 'idle',
    };
    const type = capability === 'text' ? CanvasNodeType.Text
        : capability === 'video' ? CanvasNodeType.Video
            : capability === 'audio' ? CanvasNodeType.Audio : CanvasNodeType.Image;
    return { type, metadata };
}
