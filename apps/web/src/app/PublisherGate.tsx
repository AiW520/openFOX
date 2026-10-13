import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { LogIn, LogOut, KeyRound } from 'lucide-react';
import {
  settingsManager, createModelRef, createRouteConfig,
  type ProviderProfile, type InvocationPreset,
} from '../../../../packages/drawnix/src/utils/settings-manager';
import { getStaticModelConfig, ModelVendor, type ModelType } from '../../../../packages/drawnix/src/constants/model-config';
import { PUBLISHER_CREDENTIAL_MARKER } from '../../../../packages/drawnix/src/services/publisher-transport';
import { runtimeModelDiscovery } from '../../../../packages/drawnix/src/utils/runtime-model-discovery';
import { mergePublisherSettings, removePublisherSettings, SHARED_PROFILE_ID, SHARED_PRESET_ID } from './publisher-settings';
import './publisher-gate.scss';

type SharedConfig = {
  enabled: boolean; name: string; baseUrl: string;
  models: { id: string; label: string; type: ModelType }[];
};
const PREVIOUS_PRESET = 'opentu-publisher-previous-preset';

export async function clearSharedSettings() {
  await settingsManager.waitForInitialization();
  const settings = settingsManager.getSettings();
  if (!settings.providerProfiles.some((entry) => entry.id === SHARED_PROFILE_ID) &&
    !settings.invocationPresets.some((entry) => entry.id === SHARED_PRESET_ID) &&
    settings.gemini.apiKey !== PUBLISHER_CREDENTIAL_MARKER) return;
  await settingsManager.updateSettings(removePublisherSettings(settings, localStorage.getItem(PREVIOUS_PRESET)));
  localStorage.removeItem(PREVIOUS_PRESET);
}

async function loadSharedSettings(activate = false): Promise<SharedConfig | null> {
  const response = await fetch('/api/publisher/session', { credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 401) { await clearSharedSettings(); return null; }
  if (!response.ok) throw new Error('共享模型配置加载失败');
  const config: SharedConfig = await response.json();
  if (!config.enabled) { await clearSharedSettings(); return config; }
  await settingsManager.waitForInitialization();
  const profile: ProviderProfile = {
    id: SHARED_PROFILE_ID, name: config.name, baseUrl: config.baseUrl,
    apiKey: PUBLISHER_CREDENTIAL_MARKER, providerType: 'openai-compatible', authType: 'bearer',
    enabled: true, imageApiCompatibility: 'tuzi-gpt-image', preferAsyncImageEndpoint: false,
    capabilities: { supportsModelsEndpoint: true, supportsText: true, supportsImage: true,
      supportsVideo: true, supportsAudio: true, supportsTools: true },
  };
  const models = config.models.map((model) => ({
    ...getStaticModelConfig(model.id), ...model,
    vendor: getStaticModelConfig(model.id)?.vendor || ModelVendor.OTHER,
    sourceProfileId: profile.id, sourceProfileName: profile.name,
  }));
  const routeFor = (type: ModelType) => {
    const preferred = type === 'image'
      ? models.find((model) => model.id === 'gpt-image-2.5' && model.type === type)
      : undefined;
    return createRouteConfig(createModelRef(
      profile.id,
      preferred?.id || models.find((model) => model.type === type)?.id || null
    ));
  };
  const preset: InvocationPreset = { id: SHARED_PRESET_ID, name: '平台体验', isDefault: false,
    text: routeFor('text'), image: routeFor('image'), video: routeFor('video'), audio: routeFor('audio') };
  runtimeModelDiscovery.getRevision();
  const settings = settingsManager.getSettings();
  const updates = mergePublisherSettings(settings, profile, {
    profileId: profile.id, discoveredAt: Date.now(), discoveredModels: models,
    selectedModelIds: models.map((model) => model.id), sourceBaseUrl: config.baseUrl,
    signature: SHARED_PROFILE_ID,
  }, preset, activate);
  if (updates.activePresetId === SHARED_PRESET_ID && settings.activePresetId !== SHARED_PRESET_ID) {
    localStorage.setItem(PREVIOUS_PRESET, settings.activePresetId);
  }
  await settingsManager.updateSettings(updates);
  return config;
}

export function PublisherGate({ children }: { children: ReactNode }) {
  const [gateState, setGateState] = useState<'checking' | 'required' | 'allowed'>('checking');
  const [entry, setEntry] = useState(false);
  const [shared, setShared] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadSharedSettings().then((config) => {
      if (cancelled) return;
      const hasSharedSession = Boolean(config?.enabled);
      setShared(hasSharedSession);
      setGateState(hasSharedSession ? 'allowed' : 'required');
      setEntry(!hasSharedSession);
    }).catch(() => {
      if (cancelled) return;
      clearSharedSettings().catch(() => {});
      setGateState('required');
      setEntry(true);
    });
    const openEntry = () => {
      setError('');
      setEntry(true);
    };
    window.addEventListener('publisher-credentials-required', openEntry);
    return () => {
      cancelled = true;
      window.removeEventListener('publisher-credentials-required', openEntry);
    };
  }, []);
  const login = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/publisher/login', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'tester', secret: code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '登录失败');
      setCode('');
      const config = await loadSharedSettings(true);
      if (!config?.enabled) throw new Error('共享模型尚未开放，可以使用自己的供应商');
      setShared(true); setGateState('allowed'); setEntry(false);
    } catch (problem) { setError(problem instanceof Error ? problem.message : '登录失败'); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/publisher/logout', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('退出失败，请重试');
      await clearSharedSettings(); setShared(false); setGateState('required'); setEntry(true);
    } catch (problem) { setError(problem instanceof Error ? problem.message : '退出失败'); setEntry(true); }
    finally { setBusy(false); }
  };
  const usePersonalProviders = async () => {
    if (busy) return;
    await clearSharedSettings();
    setShared(false);
    setGateState('allowed');
    setEntry(false);
  };
  if (gateState === 'checking') {
    return <div className="publisher-entry publisher-entry--loading" role="status">正在检查平台体验状态...</div>;
  }
  return <>
    {gateState === 'allowed' && children}
    {gateState === 'allowed' && <button className="publisher-logout" disabled={busy} onClick={shared ? logout : () => { setError(''); setEntry(true); }}
      title={shared ? '退出平台体验' : '平台体验'} aria-label={shared ? '退出平台体验' : '平台体验'}>
        {shared ? <LogOut size={16} /> : <KeyRound size={16} />}
        <span>{shared ? '退出平台体验' : '平台体验'}</span>
    </button>}
    {entry && <div className="publisher-entry" role="dialog" aria-modal="true" aria-labelledby="publisher-heading">
      <header><img src="/icons/favicon-32x32.png" alt="" /><strong>OpenTu</strong><span>平台体验</span></header>
      <main><form onSubmit={login}>
        <h1 id="publisher-heading">平台共享模型</h1>
        <label htmlFor="publisher-code">体验码</label>
        <input id="publisher-code" type="password" value={code} onChange={(event) => setCode(event.target.value)}
          autoComplete="current-password" maxLength={128} required autoFocus />
        <button type="submit" disabled={busy}><LogIn size={17} />{busy ? '正在验证...' : '使用平台模型'}</button>
        <button className="publisher-personal" type="button" disabled={busy} onClick={usePersonalProviders}>使用自己的供应商</button>
      </form>{error && <p className="publisher-error" role="alert">{error}</p>}</main>
    </div>}
  </>;
}
