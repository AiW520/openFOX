import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Image,
  Music2,
  Play,
  Video,
} from 'lucide-react';
import type { ModelConfig } from '../../constants/model-config';
import {
  selectShowcaseModels,
  selectAdditionalShowcaseModels,
  showcaseSelectionKey as selectionKey,
} from './showcase-models';
import {
  getModelVendorPalette,
  ModelVendorMark,
} from '../shared/ModelVendorBrand';
import './model-showcase.scss';
import { artworkCredit } from './showcase-artwork';
import { assignModelCoverArtwork } from './model-cover-artwork';

export { selectShowcaseModels } from './showcase-models';
const EMPTY_MODELS: ModelConfig[] = [];

function ModelCard({
  model,
  selected,
  onSelect,
  copy = false,
  compact = false,
  wall = false,
  coverSrc,
}: {
  model: ModelConfig;
  selected: boolean;
  onSelect: (model: ModelConfig) => void;
  copy?: boolean;
  compact?: boolean;
  wall?: boolean;
  coverSrc?: string;
}) {
  const brand = getModelVendorPalette(model.vendor);
  return (
    <button
      type="button"
      className={`model-showcase__card${
        compact ? ' model-showcase__card--compact' : ''
      }${wall ? ' model-showcase__card--wall' : ''}`}
      aria-pressed={selected}
      aria-label={`${model.shortLabel || model.label} · ${
        model.sourceProfileName || brand.label
      }`}
      tabIndex={copy ? -1 : undefined}
      onPointerDown={copy ? (event) => event.preventDefault() : undefined}
      onClick={() => onSelect(model)}
      title={[
        model.label,
        model.description,
        model.sourceProfileName,
        !compact && artworkCredit,
      ]
        .filter(Boolean)
        .join(' · ')}
      style={
        {
          '--model-accent': brand.accent,
          '--model-surface': brand.surface,
        } as CSSProperties
      }
    >
      {!compact && (
        <span
          className={`model-showcase__cover${
            model.type === 'video' ? ' model-showcase__cover--video' : ''
          }`}
          aria-hidden="true"
        >
          <img
            className="model-showcase__photo"
            src={coverSrc}
            alt=""
            width={768}
            height={768}
            loading="lazy"
            decoding="async"
          />
          <span className="model-showcase__cover-brand">
            <ModelVendorMark vendor={model.vendor} size={15} />
            {brand.label}
          </span>
          {model.type === 'video' && (
            <span className="model-showcase__video-mark">
              <Video size={14} />
            </span>
          )}
        </span>
      )}
      <span className="model-showcase__card-body">
        {compact && (
          <span className="model-showcase__mark">
            <ModelVendorMark vendor={model.vendor} size={22} />
          </span>
        )}
        <span className="model-showcase__card-text">
          <strong>{model.shortLabel || model.label}</strong>
          <span className="model-showcase__description">
            {compact
              ? model.type === 'audio'
                ? '音乐与声音'
                : model.supportsTools
                ? '对话与 Agent'
                : '对话与文案'
              : model.description ||
                (model.type === 'image'
                  ? '让想象，成为画面。'
                  : '让灵感，成为镜头。')}
          </span>
          {!compact && (
            <span className="model-showcase__source">
              {model.sourceProfileName || brand.label}
            </span>
          )}
        </span>
        <span
          className={`model-showcase__card-action${
            selected ? ' is-selected' : ''
          }`}
          aria-hidden="true"
        >
          {selected ? (
            <Check size={14} />
          ) : compact && model.type === 'audio' ? (
            <Music2 size={14} />
          ) : (
            <ArrowUpRight size={14} />
          )}
        </span>
      </span>
    </button>
  );
}

function ModelRow({
  models,
  coverArtwork,
  type,
  paused,
  manual,
  onManualChange: setManual,
  reducedMotion,
  selectedSelectionKey,
  onSelect,
  onConfigure,
  wall = false,
  reverse = false,
}: {
  models: ModelConfig[];
  coverArtwork: ReadonlyMap<string, string>;
  type: 'image' | 'video' | 'mixed';
  paused: boolean;
  manual: boolean;
  onManualChange: (manual: boolean) => void;
  reducedMotion: boolean;
  selectedSelectionKey: string;
  onSelect: (model: ModelConfig) => void;
  onConfigure: () => void;
  wall?: boolean;
  reverse?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const image = type === 'image';
  const mixed = type === 'mixed';

  useEffect(() => {
    if (!manual && railRef.current) railRef.current.scrollLeft = 0;
  }, [manual]);

  useEffect(() => {
    const rail = railRef.current;
    const group = groupRef.current;
    if (!rail || !group) return;
    const measure = () => setOverflow(group.scrollWidth > rail.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    observer.observe(group);
    return () => observer.disconnect();
  }, [models.length]);

  // Native scrolling takes over for keyboard, touch and explicit navigation.
  // It has one accessible copy of each model and never fights the user.
  const automated = overflow && !manual && !reducedMotion;
  const navigate = (direction: number) => {
    setManual(true);
    requestAnimationFrame(() => {
      const rail = railRef.current;
      if (!rail) return;
      rail.scrollBy({
        left: direction * rail.clientWidth * 0.75,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    });
  };

  return (
    <section
      className={`model-showcase__row model-showcase__row--${type}${
        wall ? ' model-showcase__row--wall' : ''
      }${reverse ? ' model-showcase__row--reverse' : ''}`}
      aria-label={`${
        mixed ? '图片与视频模型' : image ? '图片模型' : '视频模型'
      }${wall && reverse ? ' · 第二排' : ''}`}
    >
      <div className="model-showcase__row-heading">
        <h3>
          {image ? <Image size={14} /> : <Video size={14} />}
          {mixed ? '图片与视频' : image ? '图片创作' : '视频创作'}
          <span>
            {mixed
              ? '一面照片墙，浏览全部模型'
              : image
              ? '定格每一份想象'
              : '让故事流动起来'}
          </span>
        </h3>
        {overflow && (
          <div className="model-showcase__arrows">
            {manual && !reducedMotion && (
              <button
                type="button"
                onClick={() => {
                  if (railRef.current) railRef.current.scrollLeft = 0;
                  setManual(false);
                }}
                aria-label={`恢复${
                  mixed ? '图片与视频' : image ? '图片' : '视频'
                }模型自动滚动`}
              >
                <Play size={12} />
              </button>
            )}
            <button
              type="button"
              aria-label={`向前浏览${
                mixed ? '图片与视频' : image ? '图片' : '视频'
              }模型`}
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              aria-label={`向后浏览${
                mixed ? '图片与视频' : image ? '图片' : '视频'
              }模型`}
              onClick={() => navigate(1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
      {models.length ? (
        <div
          className={`model-showcase__rail${
            automated ? ' model-showcase__rail--animated' : ''
          }`}
          ref={railRef}
          onTouchStart={() => setManual(true)}
          onWheel={(event) => {
            // Vertical wheel input belongs to page scrolling. Only an explicit
            // horizontal gesture should switch the rail into manual browsing.
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
              setManual(true);
            }
          }}
          onFocusCapture={(event) => {
            if (event.target.matches(':focus-visible')) setManual(true);
          }}
          onKeyDownCapture={() => setManual(true)}
        >
          <div
            className="model-showcase__track"
            style={
              {
                '--wall-duration': `${Math.max(45, models.length * 11)}s`,
                animationPlayState: paused ? 'paused' : 'running',
              } as CSSProperties
            }
          >
            <div className="model-showcase__group" ref={groupRef}>
              {models.map((model) => (
                <ModelCard
                  key={selectionKey(model)}
                  model={model}
                  coverSrc={coverArtwork.get(selectionKey(model))}
                  selected={selectedSelectionKey === selectionKey(model)}
                  onSelect={onSelect}
                  wall={wall}
                />
              ))}
            </div>
            {automated && (
              <div
                className="model-showcase__group model-showcase__group--copy"
                aria-hidden="true"
              >
                {models.map((model) => (
                  <ModelCard
                    key={selectionKey(model)}
                    model={model}
                    coverSrc={coverArtwork.get(selectionKey(model))}
                    selected={selectedSelectionKey === selectionKey(model)}
                    onSelect={onSelect}
                    copy
                    wall={wall}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="model-showcase__empty">
          <span>
            添加{mixed ? '图片或视频' : image ? '图片' : '视频'}
            模型，开启更多创作。
          </span>
          <button type="button" onClick={onConfigure}>
            配置{mixed ? '图片或视频' : image ? '图片' : '视频'}模型{' '}
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
}

export function ModelShowcase({
  imageModels,
  videoModels,
  textModels = EMPTY_MODELS,
  audioModels = EMPTY_MODELS,
  selectedSelectionKey,
  onSelect,
  onConfigure,
}: {
  imageModels: ModelConfig[];
  videoModels: ModelConfig[];
  textModels?: ModelConfig[];
  audioModels?: ModelConfig[];
  selectedSelectionKey: string;
  onSelect: (model: ModelConfig) => void;
  onConfigure: () => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [manualRows, setManualRows] = useState<boolean[]>([]);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
  const mediaModels = useMemo(
    () => selectShowcaseModels([...imageModels, ...videoModels]),
    [imageModels, videoModels]
  );
  const wallRows = useMemo(
    () =>
      mediaModels.length
        ? [
            mediaModels.filter((_, index) => index % 2 === 0),
            mediaModels.filter((_, index) => index % 2 === 1),
          ].filter((row) => row.length)
        : [EMPTY_MODELS],
    [mediaModels]
  );
  const coverArtwork = useMemo(
    () => assignModelCoverArtwork(mediaModels),
    [mediaModels]
  );
  const more = useMemo(
    () => selectAdditionalShowcaseModels(textModels, audioModels),
    [textModels, audioModels]
  );

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(preference?.matches ?? false);
    const updateVisibility = () => setPageVisible(!document.hidden);
    preference?.addEventListener?.('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    const section = sectionRef.current;
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting),
            { threshold: 0 }
          );
    if (section && observer) observer.observe(section);
    else setVisible(true);
    return () => {
      preference?.removeEventListener?.('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
      observer?.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="model-showcase"
      aria-labelledby="model-showcase-title"
    >
      <div className="model-showcase__heading">
        <div>
          <span className="model-showcase__eyebrow">探索更多可能</span>
          <h2 id="model-showcase-title">灵感，不止一种。</h2>
          <p className="model-showcase__subtitle">不同的模型，不同的表达。</p>
        </div>
        <span className="model-showcase__heading-label">精选模型</span>
      </div>
      <div className="model-showcase__wall">
        {wallRows.map((models, index) => (
          <ModelRow
            key={index}
            models={models}
            coverArtwork={coverArtwork}
            type="mixed"
            wall
            reverse={index === 1}
            paused={!visible || !pageVisible}
            manual={manualRows[index] ?? false}
            onManualChange={(manual) =>
              setManualRows((current) => {
                const next = [...current];
                next[index] = manual;
                return next;
              })
            }
            reducedMotion={reducedMotion}
            selectedSelectionKey={selectedSelectionKey}
            onSelect={onSelect}
            onConfigure={onConfigure}
          />
        ))}
      </div>
      {!reducedMotion && mediaModels.length > 1 && (
        <div className="model-showcase__wall-footer">
          <span>双排缓慢反向流动 · 悬停停留</span>
        </div>
      )}
      <div className="model-showcase__more">
        <div className="model-showcase__more-heading">
          <h3>更多热门</h3>
          <span>文字 · Agent · 音频</span>
          <a
            href="https://api.tu-zi.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="model-showcase__more-link"
          >
            更多 <ArrowUpRight size={13} />
          </a>
        </div>
        {more.length ? (
          <div className="model-showcase__more-grid">
            {more.map((model) => (
              <ModelCard
                key={selectionKey(model)}
                model={model}
                selected={selectedSelectionKey === selectionKey(model)}
                onSelect={onSelect}
                compact
              />
            ))}
          </div>
        ) : (
          <button
            className="model-showcase__more-empty"
            type="button"
            onClick={onConfigure}
          >
            添加对话与音频模型 <ArrowUpRight size={14} />
          </button>
        )}
      </div>
    </section>
  );
}
