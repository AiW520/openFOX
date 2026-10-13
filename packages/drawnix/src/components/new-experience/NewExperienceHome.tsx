import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Copy,
  FileText,
  Image as ImageIcon,
  Layers3,
  Music2,
  X,
  Share2,
  Settings2,
  Sparkles,
  Video,
} from 'lucide-react';
import type { GenerationType } from '../../utils/ai-input-parser';
import { useProviderProfiles } from '../../hooks/use-provider-profiles';
import { useChatDrawerGenerationControls } from '../chat-drawer/useChatDrawerGenerationControls';
import { ModelDropdown } from '../ai-input-bar/ModelDropdown';
import { ParametersDropdown } from '../ai-input-bar/ParametersDropdown';
import { CountDropdown } from '../ai-input-bar/CountDropdown';
import { ModelShowcase } from './ModelShowcase';
import { FeaturedContent } from './FeaturedContent';
import { I18nProvider } from '../../i18n';
import { requestAIInputPrefill } from '../../services/ai-input-ui-events';
import './new-experience.scss';
import { useCompactScreen } from '../../hooks/use-compact-screen';
import { showcaseArtwork } from './showcase-artwork';

const PromptOptimizeDialog = lazy(() =>
  import('../shared/PromptOptimizeDialog').then((module) => ({
    default: module.PromptOptimizeDialog,
  }))
);

export interface NewExperienceHomeProps {
  currentBoardId?: string | null;
  hasCanvasContent?: boolean;
  onOpenCanvas: () => void;
  onOpenSettings: () => void;
}

type CreationType = Exclude<GenerationType, never>;

const CREATION_TYPES: Array<{
  value: CreationType;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { value: 'agent', label: 'Agent', icon: Bot },
  { value: 'image', label: '图片', icon: ImageIcon },
  { value: 'video', label: '视频', icon: Video },
  { value: 'audio', label: '音频', icon: Music2 },
  { value: 'text', label: '文案', icon: FileText },
];

const PLACEHOLDERS: Record<CreationType, string> = {
  agent: '描述目标，Agent 会帮你拆解路径并组织到画布中…',
  image: '描述画面主体、风格、构图与光线…',
  video: '描述镜头、运动、时长与画面节奏…',
  audio: '描述音乐类型、情绪、节奏或歌词方向…',
  text: '描述要写的内容、语气、结构与受众…',
};

function getProviderLabel(profileNames: string[]): string {
  if (profileNames.length === 0) return '本地 Provider';
  if (profileNames.length === 1) return profileNames[0];
  return `${profileNames[0]} 等 ${profileNames.length} 个分组`;
}

export function NewExperienceHome({
  currentBoardId,
  hasCanvasContent = false,
  onOpenCanvas,
  onOpenSettings,
}: NewExperienceHomeProps) {
  const compactScreen = useCompactScreen();
  const [prompt, setPrompt] = useState('');
  const [shareState, setShareState] = useState('');
  const [isPromptOptimizeOpen, setIsPromptOptimizeOpen] = useState(false);
  const isComposingRef = useRef(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const shareDialogRef = useRef<HTMLDialogElement>(null);
  const shareUrlRef = useRef<HTMLInputElement>(null);
  const shareUrl = 'https://api.tu-zi.com/console/chat/2';
  const homeUrl = new URL(window.location.href);
  homeUrl.searchParams.set('experience', 'new');
  homeUrl.searchParams.delete('view');
  const controls = useChatDrawerGenerationControls();
  const providerProfiles = useProviderProfiles();
  const tuziProviderNames = useMemo(
    () =>
      providerProfiles
        .filter((profile) => profile.id.startsWith('tuzi-managed-'))
        .map((profile) => profile.name),
    [providerProfiles]
  );
  const activeType = controls.generationType as CreationType;
  const canConfigureParams = controls.compatibleParams.length > 0;
  const canSelectCount = activeType === 'image' || activeType === 'video';
  const hasAvailableModel = controls.currentModels.length > 0;

  const openCanvasWithDraft = () => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || isPromptOptimizeOpen) return;

    requestAIInputPrefill({
      target: 'workflow',
      generationType: controls.generationType,
      prompt: normalizedPrompt,
      model: controls.selectedModel || undefined,
      modelRef: controls.selectedModel ? controls.selectedModelRef : null,
      params: controls.selectedParams,
      count: controls.selectedCount,
      source: 'new-experience',
    });
    onOpenCanvas();
  };

  const handleStart = () => {
    if (controls.selectedModel) openCanvasWithDraft();
  };

  const handleShareSite = async () => {
    const shareData = {
      title: 'OpenTu · AI 创作画布',
      text: 'OpenTu 开图：用 AI 生成图片、批量探索创意，将素材与结果整理到同一张画布。由兔子 API 提供模型服务：https://api.tu-zi.com',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareState('已打开系统分享');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareState('此浏览器不支持系统分享，请复制下方链接。');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState('兔子 API 工作台链接已复制');
    } catch {
      shareUrlRef.current?.focus();
      shareUrlRef.current?.select();
      setShareState('自动复制不可用，链接已选中，请手动复制。');
    }
  };

  return (
    <main className={`new-experience${compactScreen ? ' new-experience--compact' : ''}`}>
      <header className="new-experience__header">
        <a
          className="new-experience__brand"
          href={homeUrl.href}
          aria-label="OpenTu 新版首页"
          onClick={(event) => {
            // This is already the home view. Avoid reloading its unsent draft.
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            event.preventDefault();
            event.currentTarget.scrollIntoView({ block: 'start' });
          }}
        >
          <span className="new-experience__brand-mark">O</span>
          <span>OpenTu</span>
          <span className="new-experience__brand-edition">工作台</span>
        </a>
        <div className="new-experience__header-actions">
          <button
            type="button"
            className="new-experience__share-button"
            onClick={() => {
              setShareState('');
              shareDialogRef.current?.showModal();
            }}
            aria-label="分享 OpenTu 站点"
          >
            <Share2 size={15} />
            <span>分享站点</span>
          </button>
          <button
            type="button"
            className="new-experience__settings-button"
            onClick={onOpenSettings}
            aria-label="打开模型配置"
          >
            <Settings2 size={15} />
            <span>模型配置</span>
          </button>
          <div
            className={`new-experience__connection${
              hasAvailableModel ? '' : ' is-warning'
            }`}
          >
            <span className="new-experience__connection-dot" />
            <span>
              {hasAvailableModel
                ? getProviderLabel(tuziProviderNames)
                : '需要配置模型'}
            </span>
          </div>
        </div>
      </header>

      <section className="new-experience__workspace">
        {compactScreen ? <div className="new-experience__mobile-heading">
          <div><span>创作工作台</span><h1>OpenTu</h1></div>
          <img src={showcaseArtwork.studio} alt="晨光创作工作室" width={88} height={88} />
        </div> : <FeaturedContent onOpenCanvas={onOpenCanvas} />}

        <div className="new-experience__composer" ref={composerRef}>
          <div className="new-experience__composer-header">
            <div
              className="new-experience__type-tabs"
              role="group"
              aria-label="创作类型"
            >
              {CREATION_TYPES.map((item) => {
                const Icon = item.icon;
                const selected = activeType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={selected}
                    className={selected ? 'is-active' : undefined}
                    onClick={() => controls.setGenerationType(item.value)}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button
              className="new-experience__optimize new-experience__optimize--top"
              type="button"
              onClick={() => setIsPromptOptimizeOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isPromptOptimizeOpen}
            >
              <Sparkles size={16} />
              提示词优化
            </button>
          </div>

          <div className="new-experience__prompt-row">
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              onKeyDown={(event) => {
                if (
                  event.key !== 'Enter' ||
                  event.shiftKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.altKey ||
                  event.nativeEvent.isComposing ||
                  isComposingRef.current ||
                  event.nativeEvent.keyCode === 229
                )
                  return;
                if (compactScreen) return;
                event.preventDefault();
                if (!event.repeat) handleStart();
              }}
              placeholder={PLACEHOLDERS[activeType]}
              aria-label="创作描述"
              rows={3}
              aria-describedby="new-home-handoff-hint"
            />
            <div className="new-experience__prompt-actions">
              <button
                className="new-experience__start"
                type="button"
                disabled={
                  !prompt.trim() ||
                  !controls.selectedModel ||
                  isPromptOptimizeOpen
                }
                onClick={handleStart}
                aria-label="带入描述并进入新版画布"
              >
                去画布创作
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div className="new-experience__controls">
            <div className="new-experience__control new-experience__control--model">
              <span className="new-experience__control-label">模型</span>
              <ModelDropdown
                variant="form"
                selectedModel={controls.selectedModel}
                selectedSelectionKey={controls.selectedSelectionKey}
                onSelect={controls.handleModelSelect}
                models={controls.currentModels}
                strictModelList
                allowCustomValue={false}
                showProviderAction={false}
                emptyText="暂无可用模型，请打开模型配置"
              />
              {!hasAvailableModel ? (
                <button
                  type="button"
                  className="new-experience__inline-config"
                  onClick={onOpenSettings}
                >
                  <Settings2 size={13} /> 去配置可用模型
                </button>
              ) : null}
            </div>

            <div className="new-experience__control">
              <span className="new-experience__control-label">参数</span>
              {canConfigureParams ? (
                <ParametersDropdown
                  modelId={controls.selectedModel}
                  selectedParams={controls.selectedParams}
                  compatibleParams={controls.compatibleParams}
                  onParamChange={controls.handleParamSelect}
                  placement="auto"
                />
              ) : (
                <span className="new-experience__default-value">默认配置</span>
              )}
            </div>

            {canSelectCount ? (
              <div className="new-experience__control">
                <span className="new-experience__control-label">数量</span>
                <I18nProvider>
                  <CountDropdown
                    value={controls.selectedCount}
                    onSelect={controls.setSelectedCount}
                  />
                </I18nProvider>
              </div>
            ) : null}

            <button
              type="button"
              className="new-experience__canvas-shortcut"
              disabled={isPromptOptimizeOpen}
              onClick={() => {
                if (prompt.trim()) openCanvasWithDraft();
                else onOpenCanvas();
              }}
            >
              <Layers3 size={16} />
              {hasCanvasContent ? '继续当前画布' : '打开画布'}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
        {!compactScreen && <div className="new-experience__composer-note">
          <span id="new-home-handoff-hint">
            Enter 进入画布 · Shift+Enter
            换行。描述与设置会一起带入，确认后再生成。
          </span>
          <span>{currentBoardId ? '当前工作区' : '本地工作区'}</span>
        </div>}

        {!compactScreen && <ModelShowcase
          imageModels={controls.imageModels}
          videoModels={controls.videoModels}
          textModels={controls.textModels}
          audioModels={controls.audioModels}
          selectedSelectionKey={controls.selectedSelectionKey}
          onSelect={(model) => {
            controls.handleModelConfigSelect(model);
            promptRef.current?.focus({ preventScroll: true });
            composerRef.current?.scrollIntoView({
              block: 'nearest',
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'auto'
                : 'smooth',
            });
          }}
          onConfigure={onOpenSettings}
        />}
      </section>
      {isPromptOptimizeOpen && (
        <Suspense fallback={<span role="status">正在打开提示词优化…</span>}>
          <I18nProvider>
            <PromptOptimizeDialog
              open={isPromptOptimizeOpen}
              onOpenChange={(open) => {
                setIsPromptOptimizeOpen(open);
                if (!open) promptRef.current?.focus({ preventScroll: true });
              }}
              originalPrompt={prompt}
              language="zh"
              scenarioId={`ai-input.${activeType}`}
              allowStructuredMode
              onApply={(optimizedPrompt) => setPrompt(optimizedPrompt)}
            />
          </I18nProvider>
        </Suspense>
      )}
      <dialog
        ref={shareDialogRef}
        className="new-experience__share-dialog"
        aria-labelledby="share-site-title"
      >
        <form method="dialog" className="new-experience__dialog-heading">
          <span className="new-experience__eyebrow">
            <Share2 size={15} /> 分享站点
          </span>
          <button aria-label="关闭站点分享">
            <X size={18} />
          </button>
        </form>
        <h2 id="share-site-title">把 OpenTu 分享给朋友</h2>
        <p>
          一个融合 AI
          生成与无限画布的开源创作工具。在这里生成图片、探索创意、整理素材，让想法逐渐成形。
        </p>
        <a href={shareUrl} target="_blank" rel="noreferrer">
          在兔子 API 打开工作台 <ArrowRight size={14} />
        </a>
        <p>
          由兔子 API 提供模型服务，一站接入全球主流 AI 模型。
          <a
            href="https://api.tu-zi.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            了解兔子 API
          </a>
        </p>
        <label htmlFor="site-share-url">工作台链接</label>
        <input
          id="site-share-url"
          ref={shareUrlRef}
          readOnly
          value={shareUrl}
          onFocus={(event) => event.target.select()}
        />
        <div className="new-experience__share-actions">
          <button type="button" onClick={handleCopyLink}>
            <Copy size={15} /> 复制工作台链接
          </button>
          {typeof navigator.share === 'function' ? (
            <button type="button" onClick={handleShareSite}>
              <Share2 size={15} /> 系统分享
            </button>
          ) : null}
        </div>
        <p className="new-experience__share-status" role="status">
          {shareState || '分享不包含你的画布、模型配置和访问凭据。'}
        </p>
      </dialog>
    </main>
  );
}

export default NewExperienceHome;
