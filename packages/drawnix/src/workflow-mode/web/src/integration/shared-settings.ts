import { settingsManager, updateActiveInvocationRouteModel } from '../../../../utils/settings-manager';
import { readNativeModels } from '../../../host/native-models';
import { sameConfig } from '../../../shared/model-defaults';
import { decodeChannelModel, modelOptionsFromChannels, useConfigStore, type AiConfig, type ModelCapability } from '../stores/use-config-store';

let revision = 0;
const modelKeys: Partial<Record<keyof AiConfig, ModelCapability>> = {
    imageModel: 'image', model: 'image', videoModel: 'video', textModel: 'text', audioModel: 'audio',
};

export async function refreshSharedSettings(isActive: () => boolean = () => true) {
    const token = ++revision;
    const catalog = await readNativeModels();
    if (!isActive() || token !== revision) return;
    const previous = useConfigStore.getState().config;
    const config = {
        ...previous, channels: catalog.channels, models: modelOptionsFromChannels(catalog.channels),
        apiKey: '', imageModel: catalog.defaults.image, model: catalog.defaults.image,
        videoModel: catalog.defaults.video, textModel: catalog.defaults.text, audioModel: catalog.defaults.audio,
    };
    if (!sameConfig(previous, config) || !useConfigStore.getState().sharedSettingsReady)
        useConfigStore.setState({ config, opentuDefaultsInitialized: true, sharedSettingsReady: true });
}

export async function writeSharedDefault<K extends keyof AiConfig>(key: K, value: AiConfig[K]) {
    const capability = modelKeys[key];
    if (!capability || typeof value !== 'string') return;
    await settingsManager.waitForInitialization();
    const decoded = decodeChannelModel(value);
    const channel = useConfigStore.getState().config.channels.find(item => item.id === decoded?.channelId);
    if (!decoded || channel?.opentuProfileId === undefined) return;
    await updateActiveInvocationRouteModel(capability, { profileId: channel.opentuProfileId, modelId: decoded.model });
}
