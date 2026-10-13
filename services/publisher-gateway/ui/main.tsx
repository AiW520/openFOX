import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Check, Plus, Trash2 } from 'lucide-react';
import { ProviderApiKeyField } from '../../../packages/drawnix/src/components/settings-dialog/provider-api-key-field';
import { ModelDiscoveryDialog } from '../../../packages/drawnix/src/components/settings-dialog/model-discovery-dialog';
import { adaptRuntimeModel } from '../../../packages/drawnix/src/utils/runtime-model-discovery';
import { getStaticModelConfig, ModelVendor, type ModelConfig, type ModelType } from '../../../packages/drawnix/src/constants/model-config';
import './style.scss';

type SelectedModel = { id: string; label: string; type: ModelType };
type Config = { models: SelectedModel[]; hasApiKey: boolean };

function ProviderEditor() {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [selected, setSelected] = useState<SelectedModel[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const state = useRef({ key, selected, loading });
  state.current = { key, selected, loading };

  useEffect(() => {
    const baseUrl = document.getElementById('baseUrl')!;
    const clearModels = () => setModels([]);
    baseUrl.addEventListener('change', clearModels);
    const editor = {
      getModels: () => state.current.selected,
      getApiKey: () => state.current.key,
      isLoading: () => state.current.loading,
      setConfig: (config: Config) => {
        setSelected(config.models); setHasKey(config.hasApiKey); setKey('');
        setModels([]); setOpen(false); setError('');
      },
    };
    document.dispatchEvent(new CustomEvent('publisher-editor-ready', { detail: editor }));
    return () => baseUrl.removeEventListener('change', clearModels);
  }, []);

  const fetchModels = async () => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const baseUrl = (document.getElementById('baseUrl') as HTMLSelectElement).value;
      const response = await fetch('/api/publisher/admin/models', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        cache: 'no-store', body: JSON.stringify({ baseUrl, apiKey: key }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '模型获取失败');
      if (key !== state.current.key || baseUrl !== (document.getElementById('baseUrl') as HTMLSelectElement).value) {
        throw new Error('配置已更改，请重新获取模型');
      }
      const discovered: ModelConfig[] = [];
      const ids = new Set<string>();
      for (const item of data.data) {
        const model = adaptRuntimeModel(item);
        if (!model || ids.has(model.id)) continue;
        ids.add(model.id); discovered.push(model);
      }
      // Preserve already selected models when a provider omits them from /models.
      for (const model of state.current.selected) if (!ids.has(model.id)) {
        discovered.push({ ...getStaticModelConfig(model.id), ...model, vendor: ModelVendor.OTHER } as ModelConfig);
      }
      if (!discovered.length) throw new Error('没有可添加的模型');
      setModels(discovered); setOpen(true);
    } catch (problem) { setError(problem instanceof Error ? problem.message : '模型获取失败'); }
    finally { setLoading(false); }
  };

  return <>
    {createPortal(<>
      <ProviderApiKeyField value={key} onChange={(value) => { setKey(value); setError(''); setModels([]); }}
        onFetchModels={fetchModels} id="apiKey" loading={loading}
        disabled={!key.trim() && !hasKey}
        placeholder={hasKey ? '已保存，留空保留现有 Key' : '填写 API Key'} />
      {error && <p className="publisher-model-error" role="alert">{error}</p>}
    </>, document.getElementById('providerCredential')!)}
    <div className="publisher-model-toolbar">
      <span>已添加 {selected.length} 个模型</span>
      <button type="button" className="secondary" onClick={() => models.length ? setOpen(true) : fetchModels()}
        disabled={loading || (!key.trim() && !hasKey)}><Plus size={16} /> 添加模型</button>
    </div>
    <div className="publisher-selected-models">
      {selected.map((model) => <div className="publisher-selected-model" key={model.id}>
        <Check size={16} /><div><strong>{model.label}</strong><small>{model.id}</small></div>
        <span className="publisher-model-type">{{ image: '图片', text: '文本', video: '视频', audio: '音频' }[model.type]}</span>
        <button type="button" className="remove" title="移除模型" aria-label={`移除模型 ${model.id}`}
          onClick={() => setSelected((current) => current.filter((entry) => entry.id !== model.id))}><Trash2 size={16} /></button>
      </div>)}
      {!selected.length && <p className="publisher-model-empty">暂无模型</p>}
    </div>
    <ModelDiscoveryDialog open={open} container={document.getElementById('publisherDialogs')}
      models={models} selectedModelIds={selected.map((model) => model.id)} onClose={() => setOpen(false)}
      onConfirm={(ids) => {
        if (ids.length > 10000) { setError('模型数量最多 10000 个'); setOpen(false); return; }
        setSelected(models.filter((model) => ids.includes(model.id)).map(({ id, label, type }) => ({ id, label, type })));
        setOpen(false);
      }} />
  </>;
}

createRoot(document.getElementById('providerModels')!).render(<ProviderEditor />);
