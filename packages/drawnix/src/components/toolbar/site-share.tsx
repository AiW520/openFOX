import React, { useRef, useState } from 'react';
import { Copy, ExternalLink, Share2, X } from 'lucide-react';
import { ATTACHED_ELEMENT_CLASS_NAME } from '@plait/core';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover';
import { useI18n } from '../../i18n';

export const SITE_SHARE_URL = 'https://api.tu-zi.com/console/chat/2';
export const TUZI_SITE_URL = 'https://api.tu-zi.com';

export function getSiteShareText(language: string) {
  return language === 'zh'
    ? `OpenTu 开图｜把灵感，放进同一张画布。\n用 AI 生成图片、批量探索创意，把参考素材与创作结果整理在一起。\n\n在兔子 API 体验 OpenTu：\n${SITE_SHARE_URL}\n\n兔子 API：一站接入全球主流 AI 模型。\n${TUZI_SITE_URL}`
    : `OpenTu | Bring your ideas together on one canvas.\nGenerate images with AI, explore ideas in batches, and organize references and results together.\n\nTry OpenTu on Tuzi API:\n${SITE_SHARE_URL}\n\nTuzi API: One API aggregation platform for leading AI models worldwide.\n${TUZI_SITE_URL}`;
}

export const SiteShare = React.memo(function SiteShare({
  container,
}: {
  container: HTMLElement | null;
}) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const [open, setOpen] = useState(false);
  const [copyText, setCopyText] = useState(SITE_SHARE_URL);
  const [feedback, setFeedback] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  const copy = async (withIntro: boolean) => {
    const text = withIntro ? getSiteShareText(language) : SITE_SHARE_URL;
    setCopyText(text);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setFeedback(
        zh ? '已复制，可以分享给朋友了。' : 'Copied. Ready to share.'
      );
    } catch {
      // Embedded sites may forbid clipboard access. Keep the exact text visible
      // and selected rather than claiming an unsuccessful copy worked.
      if (textRef.current) {
        textRef.current.value = text;
        textRef.current.focus();
        textRef.current.select();
      }
      setFeedback(
        zh
          ? '内容已选中，请按 ⌘C / Ctrl+C 或长按复制。'
          : 'Text selected. Press ⌘C / Ctrl+C or long-press to copy.'
      );
    }
  };

  return (
    <Popover
      placement="bottom-end"
      sideOffset={10}
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="workbench-topbar__button workbench-topbar__share"
          aria-expanded={open}
          aria-label={zh ? '分享站点' : 'Share site'}
          onClick={() => {
            setOpen(!open);
            setFeedback('');
            setCopyText(SITE_SHARE_URL);
          }}
          data-testid="workbench-share"
        >
          <Share2 size={16} aria-hidden="true" />
          <span>{zh ? '分享站点' : 'Share site'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        container={container}
        className={`workbench-share ${ATTACHED_ELEMENT_CLASS_NAME}`}
        aria-label={zh ? '分享 OpenTu 站点' : 'Share OpenTu'}
      >
        <header className="workbench-share__header">
          <strong>
            {zh ? '把 OpenTu 分享给朋友' : 'Share OpenTu with friends'}
          </strong>
          <button
            type="button"
            className="workbench-topbar__button"
            onClick={() => setOpen(false)}
            aria-label={zh ? '关闭分享' : 'Close sharing'}
          >
            <X size={16} />
          </button>
        </header>
        <div className="workbench-share__intro">
          <span>OPENTU · {zh ? '开图' : 'CANVAS'}</span>
          <h2>
            {zh
              ? '把灵感，放进同一张画布。'
              : 'Bring your ideas together on one canvas.'}
          </h2>
          <p>
            {zh
              ? '用 AI 生成图片、批量探索创意，把参考素材与创作结果整理在一起。'
              : 'Generate images with AI, explore ideas in batches, and organize references and results together.'}
          </p>
          <p className="workbench-share__brand">
            {zh ? '在兔子 API 体验 OpenTu' : 'Experience OpenTu on Tuzi API'}
            <small>
              {zh
                ? '兔子 API · 一站接入全球主流 AI 模型'
                : 'Tuzi API · Access leading AI models worldwide'}
            </small>
          </p>
        </div>
        <textarea
          ref={textRef}
          className="workbench-share__text"
          aria-label={zh ? '分享内容' : 'Share content'}
          readOnly
          value={copyText}
          rows={copyText === SITE_SHARE_URL ? 2 : 7}
        />
        <div className="workbench-share__actions">
          <button
            type="button"
            className="workbench-topbar__button workbench-share__copy"
            onClick={() => void copy(true)}
          >
            <Copy size={16} />
            {zh ? '复制介绍和链接' : 'Copy introduction & link'}
          </button>
          <button
            type="button"
            className="workbench-topbar__button"
            onClick={() => void copy(false)}
          >
            {zh ? '仅复制链接' : 'Copy link'}
          </button>
        </div>
        <div className="workbench-share__links">
          <a href={SITE_SHARE_URL} target="_blank" rel="noopener noreferrer">
            {zh ? '打开工作台' : 'Open workbench'} <ExternalLink size={13} />
          </a>
          <a href={TUZI_SITE_URL} target="_blank" rel="noopener noreferrer">
            {zh ? '了解兔子 API' : 'About Tuzi API'} <ExternalLink size={13} />
          </a>
        </div>
        <p className="workbench-share__feedback" role="status">
          {feedback ||
            (zh
              ? '仅分享站点介绍，不包含你的画布或对话。'
              : 'Shares the site only, without your canvas or conversations.')}
        </p>
      </PopoverContent>
    </Popover>
  );
});
