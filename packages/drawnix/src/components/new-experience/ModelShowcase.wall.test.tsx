import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelVendor, type ModelConfig } from '../../constants/model-config';
import { ModelShowcase } from './ModelShowcase';
import { selectAdditionalShowcaseModels } from './showcase-models';

const make = (
  id: string,
  type: ModelConfig['type'],
  vendor = ModelVendor.GPT
): ModelConfig => ({
  id,
  label: id,
  type,
  vendor,
  sourceProfileId: 'provider-a',
  sourceProfileName: 'Provider A',
  selectionKey: `provider-a::${id}`,
});
const image = make('image-one', 'image');
const video = make('video-one', 'video');
const text = make('text-one', 'text');
const audio = make('audio-one', 'audio', ModelVendor.SUNO);
let changeMotion: (() => void) | undefined;
let intersect: (entries: { isIntersecting: boolean }[]) => void;
let reduce = false;
const scrollWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollWidth'
);
const clientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth'
);

beforeEach(() => {
  reduce = false;
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduce;
    },
    addEventListener: (_: string, fn: () => void) => {
      changeMotion = fn;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof intersect) {
        intersect = callback;
      }
      observe() {
        intersect([{ isIntersecting: true }]);
      }
      disconnect() {
        return;
      }
    }
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => 900,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 400,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (scrollWidth)
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollWidth);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
  if (clientWidth)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  else Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
});

function mount(onSelect = vi.fn()) {
  return {
    onSelect,
    ...render(
      <ModelShowcase
        imageModels={[image]}
        videoModels={[video]}
        textModels={[text]}
        audioModels={[audio]}
        selectedSelectionKey={image.selectionKey!}
        onSelect={onSelect}
        onConfigure={vi.fn()}
      />
    ),
  };
}

describe('approved model photo wall', () => {
  it('gives all 12 models distinct covers across both rows, preserving them on reorder and loop copies', () => {
    const models = Array.from({ length: 12 }, (_, index) =>
      make(`custom-model-${index}`, index % 2 ? 'video' : 'image')
    );
    // The same model from a different provider is still a separate card.
    models[10] = {
      ...models[0],
      sourceProfileId: 'provider-b',
      sourceProfileName: 'Provider B',
      selectionKey: `provider-b::${models[0].id}`,
    };
    const props = {
      imageModels: models.filter((model) => model.type === 'image'),
      videoModels: models.filter((model) => model.type === 'video'),
      selectedSelectionKey: '',
      onSelect: vi.fn(),
      onConfigure: vi.fn(),
    };
    const { container, rerender } = render(<ModelShowcase {...props} />);
    const readCovers = () =>
      new Map(
        [
          ...container.querySelectorAll<HTMLButtonElement>(
            '.model-showcase__group:not(.model-showcase__group--copy) button'
          ),
        ].map((card) => [
          card.getAttribute('aria-label'),
          card.querySelector('img')?.getAttribute('src'),
        ])
      );
    const originals = readCovers();
    expect(originals.size).toBe(12);
    expect([...originals.values()].every(Boolean)).toBe(true);
    expect(new Set(originals.values()).size).toBe(12);
    rerender(
      <ModelShowcase
        {...props}
        imageModels={[...props.imageModels].reverse()}
        videoModels={[...props.videoModels].reverse()}
      />
    );
    expect(readCovers()).toEqual(originals);
    const copies = container.querySelectorAll<HTMLButtonElement>(
      '.model-showcase__group--copy button'
    );
    expect(copies.length).toBe(12);
    for (const card of copies) {
      expect(card.querySelector('img')?.getAttribute('src')).toBe(
        originals.get(card.getAttribute('aria-label'))
      );
    }
  });

  it('combines image and video models into one wall without a category picker', () => {
    const { onSelect } = mount();
    expect(screen.queryByRole('group', { name: '模型展示类型' })).toBeNull();
    const media = screen.getByRole('region', { name: '图片与视频模型' });
    for (const model of [image, video, text, audio]) {
      fireEvent.click(
        screen.getByRole('button', { name: `${model.label} · Provider A` })
      );
      expect(onSelect).toHaveBeenLastCalledWith(model);
    }
    expect(
      within(media)
        .getByRole('button', { name: /image-one/ })
        .getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen.getByRole('link', { name: /更多/ }).getAttribute('href')
    ).toBe('https://api.tu-zi.com/pricing');
  });

  it('keeps animated copies pointer-selectable but out of the keyboard and accessibility order', () => {
    const { container, onSelect } = mount();
    const copy = container.querySelector<HTMLButtonElement>(
      '.model-showcase__group--copy button'
    )!;
    expect(copy.tabIndex).toBe(-1);
    expect(copy.parentElement?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(copy);
    expect(onSelect).toHaveBeenCalledWith(image);
  });

  it('pauses offscreen and switches to native browsing when motion is reduced', () => {
    const { container } = mount();
    const track = container.querySelector<HTMLElement>(
      '.model-showcase__track'
    )!;
    expect(track.style.animationPlayState).toBe('running');
    act(() => intersect([{ isIntersecting: false }]));
    expect(track.style.animationPlayState).toBe('paused');
    act(() => {
      reduce = true;
      changeMotion?.();
    });
    expect(
      container.querySelector('.model-showcase__rail--animated')
    ).toBeNull();
    expect(container.querySelector('.model-showcase__group--copy')).toBeNull();
    expect(screen.queryByRole('button', { name: /暂停模型展示|播放模型展示/ })).toBeNull();
  });

  it('stops automatic motion for touch and keyboard exploration', () => {
    const { container } = mount();
    const rails = container.querySelectorAll('.model-showcase__rail');
    fireEvent.touchStart(rails[0]);
    fireEvent.keyDown(rails[0], { key: 'Tab' });
    expect(rails[0].classList.contains('model-showcase__rail--animated')).toBe(
      false
    );
    expect(rails[1].classList.contains('model-showcase__rail--animated')).toBe(
      true
    );
    expect(
      screen.getByRole('button', { name: '恢复图片与视频模型自动滚动' })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '恢复图片与视频模型自动滚动' }));
    expect(rails[0].classList.contains('model-showcase__rail--animated')).toBe(
      true
    );
  });

  it('keeps moving on vertical page scroll and can resume after horizontal browsing', () => {
    const { container } = mount();
    const rail = container.querySelector('.model-showcase__rail')!;
    fireEvent.wheel(rail, { deltaX: 0, deltaY: 150 });
    expect(rail.classList.contains('model-showcase__rail--animated')).toBe(
      true
    );
    fireEvent.wheel(rail, { deltaX: 150, deltaY: 0 });
    expect(rail.classList.contains('model-showcase__rail--animated')).toBe(
      false
    );
    fireEvent.click(screen.getByRole('button', { name: '恢复图片与视频模型自动滚动' }));
    expect(rail.classList.contains('model-showcase__rail--animated')).toBe(
      true
    );
  });

  it('offers independent configuration entries for empty image/video categories', () => {
    const configure = vi.fn();
    render(
      <ModelShowcase
        imageModels={[]}
        videoModels={[]}
        selectedSelectionKey=""
        onSelect={vi.fn()}
        onConfigure={configure}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /配置图片或视频模型/ }));
    expect(configure).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: /添加对话与音频模型/ })
    ).toBeTruthy();
  });

  it('diversifies the additional shelf without losing configured model objects', () => {
    const lower = { ...make('text-two', 'text'), recommendedScore: 1 };
    const best = { ...text, recommendedScore: 90 };
    const deepseek = make('deepseek', 'text', ModelVendor.DEEPSEEK);
    const hidden = {
      ...make('hidden', 'text', ModelVendor.ANTHROPIC),
      recommendedScore: -1,
    };
    expect(
      selectAdditionalShowcaseModels([lower, best, deepseek, hidden], [audio])
    ).toEqual([best, deepseek, audio]);
  });
});
