import { Image, PenLine } from 'lucide-react';
import { useI18n } from '../../i18n';
import './canvas-prompt-guide.scss';

export function CanvasPromptGuide({
  onSelect,
}: {
  onSelect: (info: { content: string; modelType: 'image' }) => void;
}) {
  const { language } = useI18n();
  const zh = language === 'zh';
  return (
    <div className="canvas-prompt-guide" data-testid="canvas-prompt-guide">
      <div className="canvas-prompt-guide__intro">
        <span>
          <PenLine size={18} />
        </span>
        <div>
          <strong>{zh ? '从一个想法开始' : 'Start with an idea'}</strong>
          <p>
            {zh
              ? '写下描述，或添加一张参考图。'
              : 'Describe it, or add a reference image.'}
          </p>
        </div>
      </div>
      <div className="canvas-prompt-guide__suggestions">
        <button
          type="button"
          onClick={() =>
            onSelect({
              modelType: 'image',
              content: zh
                ? '为一款香水拍摄极简产品大片，柔和的自然光，细腻的玻璃质感，干净的背景与留白。'
                : 'A minimal perfume product photograph with soft natural light, delicate glass texture and a clean backdrop.',
            })
          }
        >
          <Image size={13} />
          {zh ? '产品摄影' : 'Product photo'}
        </button>
        <button
          type="button"
          onClick={() =>
            onSelect({
              modelType: 'image',
              content: zh
                ? '设计一张现代艺术展览海报，克制的配色，清晰的视觉层级，富有节奏的几何构图。'
                : 'A modern art exhibition poster with a restrained palette, clear visual hierarchy and rhythmic geometric composition.',
            })
          }
        >
          {zh ? '海报设计' : 'Poster design'}
        </button>
      </div>
    </div>
  );
}
