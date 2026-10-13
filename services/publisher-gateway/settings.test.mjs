import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergePublisherSettings, removePublisherSettings } from '../../apps/web/src/app/publisher-settings.ts';

const profile = { id: 'publisher-shared', apiKey: 'opentu-publisher:shared' };
const catalog = { profileId: profile.id, selectedModelIds: ['gpt-image-2'] };
const preset = { id: 'publisher-default' };
const personal = {
  gemini: { apiKey: 'sk-own', baseUrl: 'https://own.example/v1' },
  providerProfiles: [{ id: 'own', apiKey: 'sk-own' }],
  providerCatalogs: [{ profileId: 'own', selectedModelIds: ['own-model'] }],
  invocationPresets: [{ id: 'own-preset', isDefault: true }],
  activePresetId: 'own-preset',
};

test('shared configuration preserves personal credentials, catalogs and active preset', () => {
  const before = structuredClone(personal);
  const merged = { ...personal, ...mergePublisherSettings(personal, profile, catalog, preset) };
  assert.deepEqual(merged.gemini, before.gemini);
  assert.deepEqual(merged.providerProfiles[0], before.providerProfiles[0]);
  assert.deepEqual(merged.providerCatalogs[0], before.providerCatalogs[0]);
  assert.deepEqual(merged.invocationPresets[0], before.invocationPresets[0]);
  assert.equal(merged.activePresetId, 'own-preset');
  assert.deepEqual(personal, before);
  const refreshed = { ...merged, ...mergePublisherSettings(merged, profile, catalog, preset) };
  assert.equal(refreshed.providerProfiles.length, 2);
  assert.deepEqual({ ...refreshed, ...removePublisherSettings(refreshed) }, personal);
});

test('explicit trial activation restores the prior preset on exit and respects later user selections', () => {
  const merged = { ...personal, ...mergePublisherSettings(personal, profile, catalog, preset, true) };
  assert.equal(merged.activePresetId, preset.id);
  assert.deepEqual({ ...merged, ...removePublisherSettings(merged, personal.activePresetId) }, personal);
  merged.activePresetId = 'own-preset';
  assert.equal(mergePublisherSettings(merged, profile, catalog, preset).activePresetId, 'own-preset');
  assert.equal(removePublisherSettings(merged).activePresetId, 'own-preset');
});

test('first trial works without personal keys; old trial credential markers are removed', () => {
  const empty = { ...personal, gemini: { ...personal.gemini, apiKey: '' }, providerProfiles: [{ id: 'own', apiKey: '' }] };
  assert.equal(mergePublisherSettings(empty, profile, catalog, preset).activePresetId, preset.id);
  const old = { ...empty, gemini: { ...empty.gemini, apiKey: profile.apiKey },
    providerProfiles: [profile, { id: 'legacy-default', apiKey: profile.apiKey }], invocationPresets: [preset], activePresetId: preset.id };
  const cleaned = { ...old, ...removePublisherSettings(old) };
  assert.ok(!JSON.stringify(cleaned).includes(profile.apiKey));
});

test('refresh preserves valid canvas model choices and replaces removed shared models', () => {
  const first = { defaultModelRef: { profileId: profile.id, modelId: 'text-a' } };
  const second = { defaultModelRef: { profileId: profile.id, modelId: 'text-b' } };
  const sharedCatalog = { ...catalog, discoveredModels: [
    { id: 'text-a', type: 'text' }, { id: 'text-b', type: 'text' },
  ] };
  const sharedPreset = { ...preset, text: first };
  const settings = { ...personal, providerCatalogs: [...personal.providerCatalogs, sharedCatalog],
    invocationPresets: [...personal.invocationPresets, { ...sharedPreset, text: second }] };
  const refreshed = mergePublisherSettings(settings, profile, sharedCatalog, sharedPreset);
  assert.deepEqual(refreshed.invocationPresets.at(-1).text, second);
  const removed = mergePublisherSettings(settings, profile,
    { ...sharedCatalog, discoveredModels: [{ id: 'text-a', type: 'text' }] }, sharedPreset);
  assert.deepEqual(removed.invocationPresets.at(-1).text, first);
});

test('trial image default prefers GPT Image 2.5 regardless of catalog order or stale route', () => {
  const imageCatalog = { ...catalog, discoveredModels: [
    { id: 'api-images-seededit', type: 'image' },
    { id: 'gpt-image-2.5', type: 'image' },
  ] };
  const staleRoute = { defaultModelRef: { profileId: profile.id, modelId: 'api-images-seededit' } };
  const stalePreset = { ...preset, image: staleRoute };
  const settings = { ...personal, invocationPresets: [...personal.invocationPresets, stalePreset] };
  const merged = mergePublisherSettings(settings, profile, imageCatalog, stalePreset, true);
  assert.deepEqual(merged.invocationPresets.at(-1).image.defaultModelRef,
    { profileId: profile.id, modelId: 'gpt-image-2.5' });
  assert.deepEqual(merged.invocationPresets[0], personal.invocationPresets[0]);
  assert.deepEqual(settings.invocationPresets.at(-1).image, staleRoute);
});
