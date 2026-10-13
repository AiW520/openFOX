import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { HoverTip } from '../shared/hover';
import './provider-api-key-field.scss';

interface ProviderApiKeyFieldProps {
  value: string;
  onChange: (value: string) => void;
  onFetchModels: () => void;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
  id?: string;
}

export function ProviderApiKeyField({ value, onChange, onFetchModels, loading = false,
  disabled = false, compact = false, placeholder, id }: ProviderApiKeyFieldProps) {
  const [visible, setVisible] = useState(false);
  return <div className={`provider-api-key-field${compact ? ' provider-api-key-field--compact' : ''}`}>
    <div className="settings-dialog__secret-input-wrap">
      <input id={id} aria-label="API Key" type={visible ? 'text' : 'password'}
        className="settings-dialog__input settings-dialog__secret-input" value={value}
        onChange={(event) => onChange(event.target.value)} autoComplete="new-password"
        maxLength={512} placeholder={placeholder} />
      <HoverTip content={visible ? '隐藏 API Key' : '查看 API Key'} showArrow={false}>
        <button type="button" className="settings-dialog__secret-toggle"
          title={visible ? '隐藏 API Key' : '查看 API Key'}
          aria-label={visible ? '隐藏 API Key' : '查看 API Key'}
          onMouseDown={(event) => event.preventDefault()} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </HoverTip>
    </div>
    <button type="button" className="settings-dialog__button settings-dialog__button--fetch"
      onClick={onFetchModels} disabled={disabled || loading}>
      {loading ? <><Loader2 size={15} className="settings-dialog__button-spinner" />同步中</> : '获取模型'}
    </button>
  </div>;
}
