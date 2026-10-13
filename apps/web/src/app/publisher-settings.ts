import type { AppSettings, ProviderProfile, ProviderCatalog, InvocationPreset, RouteConfig } from '../../../../packages/drawnix/src/utils/settings-types';

export const SHARED_PROFILE_ID = 'publisher-shared';
export const SHARED_PRESET_ID = 'publisher-default';
const MARKER = 'opentu-publisher:shared';

export function mergePublisherSettings(
  settings: AppSettings, profile: ProviderProfile, catalog: ProviderCatalog,
  preset: InvocationPreset, activate = false
): Partial<AppSettings> {
  const hasPersonalKey = Boolean(settings.gemini.apiKey && settings.gemini.apiKey !== MARKER) ||
    settings.providerProfiles.some((entry) => entry.id !== SHARED_PROFILE_ID && entry.apiKey && entry.apiKey !== MARKER);
  const previousPreset = settings.invocationPresets.find((entry) => entry.id === SHARED_PRESET_ID);
  const sharedPreset = { ...preset };
  if (catalog.discoveredModels?.some((model) => model.id === 'gpt-image-2.5' && model.type === 'image')) {
    sharedPreset.image = {
      ...preset.image,
      defaultModelRef: { profileId: SHARED_PROFILE_ID, modelId: 'gpt-image-2.5' },
    };
  }
  for (const type of ['image', 'text', 'video', 'audio'] as const) {
    // The publisher experience has a stable image default. Do not revive a
    // stale browser selection such as api-images-seededit when refreshing it.
    if (type === 'image') continue;
    const previousRoute: RouteConfig | undefined = previousPreset?.[type];
    const modelRef = previousRoute?.defaultModelRef;
    const previousCatalog = settings.providerCatalogs.find((entry) => entry.profileId === modelRef?.profileId);
    const routeCatalog = modelRef?.profileId === SHARED_PROFILE_ID ? catalog : previousCatalog;
    if (modelRef && routeCatalog?.discoveredModels?.some((model) => model.id === modelRef.modelId && model.type === type)) {
      sharedPreset[type] = previousRoute!;
    }
  }
  return {
    providerProfiles: [...settings.providerProfiles.filter((entry) => entry.id !== SHARED_PROFILE_ID), profile],
    providerCatalogs: [...settings.providerCatalogs.filter((entry) => entry.profileId !== SHARED_PROFILE_ID), catalog],
    invocationPresets: [...settings.invocationPresets.filter((entry) => entry.id !== SHARED_PRESET_ID), sharedPreset],
    activePresetId: activate || (!hasPersonalKey && !settings.providerProfiles.some((entry) => entry.id === SHARED_PROFILE_ID))
      ? preset.id : settings.activePresetId,
  };
}

export function removePublisherSettings(settings: AppSettings, previousPresetId?: string | null): Partial<AppSettings> {
  const presets = settings.invocationPresets.filter((entry) => entry.id !== SHARED_PRESET_ID);
  const fallback = presets.find((entry) => entry.id === previousPresetId) || presets.find((entry) => entry.isDefault) || presets[0];
  return {
    providerProfiles: settings.providerProfiles.filter((entry) => entry.id !== SHARED_PROFILE_ID)
      .map((entry) => entry.apiKey === MARKER ? { ...entry, apiKey: '' } : entry),
    providerCatalogs: settings.providerCatalogs.filter((entry) => entry.profileId !== SHARED_PROFILE_ID),
    invocationPresets: presets,
    activePresetId: settings.activePresetId === SHARED_PRESET_ID ? fallback?.id || '' : settings.activePresetId,
    // Clean credentials written by the earlier trial entry implementation.
    ...(settings.gemini.apiKey === MARKER ? { gemini: { ...settings.gemini, apiKey: '' } } : {}),
  };
}
