import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
} from 'lucide-react';
import './featured-content.scss';
import { showcaseArtwork } from './showcase-artwork';

type FeaturedItem = {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  detail: string;
  media?:
    | { type: 'image'; src: string; alt: string }
    | { type: 'video'; src: string; poster?: string };
  art: string;
};

const FEATURED_ITEMS: FeaturedItem[] = [
  {
    id: 'canvas-update',
    kicker: '产品指南',
    title: '创作画布更新',
    summary: '把灵感、模型和结果放在同一张可编辑的创作空间。',
    detail:
      '把新的创意带进画布，继续完善你的创作。',
    art: 'featured-content__art--canvas',
    media: {
      type: 'image',
      src: showcaseArtwork.studio,
      alt: 'GPT Image 2.5 生成的晨光创作工作室',
    },
  },
  {
    id: 'quiet-space',
    kicker: '灵感示例 · 插画',
    title: '东方留白',
    summary: '一张作品，也可以成为下一次创作的起点。',
    detail:
      '试着从一组安静的颜色开始：青绿色的远山、薄雾与平静的湖面。保留大片留白，让画面的层次只靠山形和光线展开。这张封面由 GPT Image 2.5 生成，供构图参考。',
    art: 'featured-content__art--mountain',
    media: {
      type: 'image',
      src: showcaseArtwork.mountains,
      alt: 'GPT Image 2.5 生成的青山、湖泊与薄雾',
    },
  },
  {
    id: 'image-model',
    kicker: '模型亮点 · 图片',
    title: '图片模型能力',
    summary: '从主体、构图到光线，让想法更清晰。',
    detail:
      '好的描述通常包含主体、环境、构图、光线和风格。可以先用首页的提示词优化整理描述，再从下方照片墙选择可用图片模型。不同模型支持的参数不同，选择后会显示对应选项。',
    art: 'featured-content__art--sphere',
    media: {
      type: 'image',
      src: showcaseArtwork.stillLife,
      alt: 'GPT Image 2.5 生成的玻璃香水与杏子静物',
    },
  },
  {
    id: 'video-model',
    kicker: '模型亮点 · 视频',
    title: '视频模型亮点',
    summary: '从一个画面出发，写下镜头里的运动与节奏。',
    detail:
      '描述视频时，除了画面主体，也可以写清楚镜头如何移动、主体如何行动，以及你希望的节奏。例如：夕阳下的山谷，镜头缓慢推进，薄雾沿山脊流动。选择可用的视频模型后，再按模型支持的参数调整。',
    art: 'featured-content__art--sunset',
    media: {
      type: 'image',
      src: showcaseArtwork.coast,
      alt: 'GPT Image 2.5 生成的海岸公路静态灵感图，非视频样片',
    },
  },
  {
    id: 'batch-create',
    kicker: '工作流 · 多结果',
    title: '批量生图',
    summary: '一次探索更多构图和风格，把灵感留在画布里。',
    detail:
      '在首页切换到图片创作，选择模型后打开数量选项，可选择 1、2、3、4、5、10 或 20 张。描述、模型、参数和数量会一起带进画布；确认生成后，再从多个结果中挑选喜欢的方向。',
    art: 'featured-content__art--grid',
    media: {
      type: 'image',
      src: showcaseArtwork.moodboard,
      alt: 'GPT Image 2.5 生成的植物与风景灵感卡片',
    },
  },
];

const CARD_POSITIONS: Record<
  number,
  { x: number; y: number; rotate: number; scale: number; opacity: number }
> = {
  '-2': { x: -350, y: 50, rotate: -13, scale: 0.78, opacity: 0.62 },
  '-1': { x: -198, y: 22, rotate: -7, scale: 0.91, opacity: 0.93 },
  0: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
  1: { x: 198, y: 22, rotate: 7, scale: 0.91, opacity: 0.93 },
  2: { x: 350, y: 50, rotate: 13, scale: 0.78, opacity: 0.62 },
};

function getRelativeOffset(index: number, activeIndex: number, length: number) {
  const half = Math.floor(length / 2);
  let offset = index - activeIndex;
  if (offset > half) offset -= length;
  if (offset < -half) offset += length;
  return offset;
}

export function FeaturedContent({
  onOpenCanvas,
}: {
  onOpenCanvas: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeItem, setActiveItem] = useState<FeaturedItem | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const sectionRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const active = FEATURED_ITEMS[activeIndex];
  const cards = useMemo(
    () =>
      FEATURED_ITEMS.map((item, index) => ({
        item,
        index,
        offset: getRelativeOffset(index, activeIndex, FEATURED_ITEMS.length),
      })),
    [activeIndex]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeItem && dialog && !dialog.open) dialog.showModal();
  }, [activeItem]);

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(preference?.matches ?? false);
    const updateVisibility = () => setPageVisible(!document.hidden);
    preference?.addEventListener?.('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) =>
            setVisible(entry.isIntersecting)
          );
    if (sectionRef.current && observer) observer.observe(sectionRef.current);
    else setVisible(true);
    return () => {
      preference?.removeEventListener?.('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
      observer?.disconnect();
    };
  }, []);

  const autoPlaying =
    !hovered &&
    !focused &&
    !touching &&
    !activeItem &&
    !reducedMotion &&
    visible &&
    pageVisible;
  useEffect(() => {
    if (!autoPlaying) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % FEATURED_ITEMS.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, autoPlaying]);

  const move = (direction: number) => {
    setActiveIndex(
      (current) =>
        (current + direction + FEATURED_ITEMS.length) % FEATURED_ITEMS.length
    );
  };

  const openItem = (item: FeaturedItem, index: number) => {
    setActiveIndex(index);
    setActiveItem(item);
  };

  return (
    <section
      ref={sectionRef}
      className="featured-content"
      aria-labelledby="featured-content-title"
      onFocusCapture={(event) => {
        if (event.target.matches(':focus-visible')) setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <div className="featured-content__heading">
        <div>
          <span className="featured-content__eyebrow">OpenTu · 精选内容</span>
          <h1 id="featured-content-title">先看灵感，再开始创作。</h1>
          <p>发现新的表达，也找到更顺手的创作方式。</p>
        </div>
        <span className="featured-content__label">精选内容</span>
      </div>

      <div
        className="featured-content__stage"
        aria-label="精选内容卡片"
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onTouchStart={(event) => {
          setTouching(true);
          const touch = event.touches[0];
          touchStartRef.current =
            event.touches.length === 1
              ? { x: touch.clientX, y: touch.clientY }
              : null;
        }}
        onTouchCancel={() => {
          setTouching(false);
          touchStartRef.current = null;
        }}
        onTouchEnd={(event) => {
          setTouching(false);
          const start = touchStartRef.current;
          touchStartRef.current = null;
          const touch = event.changedTouches[0];
          if (!start || !touch) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            suppressClickUntil.current = Date.now() + 500;
            move(dx < 0 ? 1 : -1);
          }
        }}
        onClickCapture={(event) => {
          if (Date.now() < suppressClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowRight' ? 1 : -1);
          }
        }}
      >
        {cards.map(({ item, index, offset }) => {
          const position = CARD_POSITIONS[offset];
          return (
            <button
              key={item.id}
              type="button"
              className={`featured-content__card${
                offset === 0 ? ' is-center' : ''
              }`}
              aria-label={`查看${item.title}`}
              aria-haspopup="dialog"
              onClick={() => openItem(item, index)}
              style={
                {
                  '--featured-x': `${position.x}px`,
                  '--featured-y': `${position.y}px`,
                  '--featured-rotate': `${position.rotate}deg`,
                  '--featured-scale': position.scale,
                  '--featured-opacity': position.opacity,
                  '--featured-layer': 3 - Math.abs(offset),
                } as CSSProperties
              }
            >
              <span
                className={`featured-content__art ${
                  item.media?.type === 'image'
                    ? 'featured-content__art--photo'
                    : item.art
                }`}
                aria-hidden="true"
              >
                {item.media?.type === 'image' && (
                  <img
                    src={item.media.src}
                    alt=""
                    width={768}
                    height={768}
                    decoding="async"
                  />
                )}
                {item.media?.type === 'video' ? (
                  <span className="featured-content__play">
                    <Play size={15} />
                  </span>
                ) : null}
              </span>
              <span className="featured-content__card-copy">
                <small>{item.kicker}</small>
                <strong>{item.title}</strong>
                <em>{item.summary}</em>
              </span>
              {item.id === 'canvas-update' ? (
                <span className="featured-content__badge">本周推荐</span>
              ) : (
                <span
                  className="featured-content__card-arrow"
                  aria-hidden="true"
                >
                  <ArrowUpRight size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="featured-content__footer">
        <span
          className="featured-content__hint"
          aria-live={autoPlaying ? 'off' : 'polite'}
        >
          {active.title} · {activeIndex + 1} / {FEATURED_ITEMS.length}
        </span>
        <div className="featured-content__navigation" aria-label="浏览精选内容">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="上一条精选内容"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="featured-content__dots" aria-hidden="true">
            {FEATURED_ITEMS.map((item, index) => (
              <span
                key={item.id}
                className={index === activeIndex ? 'is-active' : ''}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="下一条精选内容"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="featured-content__dialog"
        aria-labelledby="featured-content-dialog-title"
        onClose={() => setActiveItem(null)}
      >
        {activeItem ? (
          <>
            <form method="dialog" className="featured-content__dialog-header">
              <span>精选内容</span>
              <button type="submit" aria-label="关闭精选内容">
                <X size={17} />
              </button>
            </form>
            {activeItem.media?.type === 'video' ? (
              <video
                className="featured-content__dialog-art"
                controls
                playsInline
                preload="none"
                src={activeItem.media.src}
                poster={activeItem.media.poster}
                aria-label={`${activeItem.title}视频`}
              />
            ) : activeItem.media?.type === 'image' ? (
              <img
                className="featured-content__dialog-art"
                src={activeItem.media.src}
                alt={activeItem.media.alt}
              />
            ) : (
              <div
                className={`featured-content__dialog-art ${activeItem.art}`}
                aria-hidden="true"
              />
            )}
            <span className="featured-content__dialog-kicker">
              {activeItem.kicker}
            </span>
            <h3 id="featured-content-dialog-title">{activeItem.title}</h3>
            <p>{activeItem.detail}</p>
            <div className="featured-content__dialog-actions">
              <button
                type="button"
                className="featured-content__primary"
                onClick={() => {
                  dialogRef.current?.close?.();
                  onOpenCanvas();
                }}
              >
                打开画布 <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="featured-content__secondary"
                onClick={() => dialogRef.current?.close?.()}
              >
                稍后再看
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </section>
  );
}

export default FeaturedContent;
