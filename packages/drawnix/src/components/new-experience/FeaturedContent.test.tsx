import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeaturedContent } from './FeaturedContent';

const originalShowModal = HTMLDialogElement.prototype.showModal;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalShowModal) {
    HTMLDialogElement.prototype.showModal = originalShowModal;
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  }
});

describe('featured A1 content carousel', () => {
  it('automatically cycles all five cards without adding a pause control', () => {
    vi.useFakeTimers();
    render(<FeaturedContent onOpenCanvas={vi.fn()} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/2 \/ 5/)).toBeTruthy();
    for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/1 \/ 5/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: '暂停自动浏览精选内容' })
    ).toBeNull();
  });

  it('pauses while touching or reading a detail and resumes after touch release', () => {
    vi.useFakeTimers();
    HTMLDialogElement.prototype.showModal = vi.fn();
    render(<FeaturedContent onOpenCanvas={vi.fn()} />);
    const stage = screen.getByLabelText('精选内容卡片');
    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 100 }] });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/1 \/ 5/)).toBeTruthy();
    fireEvent.touchEnd(stage, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/2 \/ 5/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看东方留白' }));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText(/2 \/ 5/)).toBeTruthy();
  });

  it('does not rotate offscreen or under reduced motion', () => {
    vi.useFakeTimers();
    let intersect: (entries: { isIntersecting: boolean }[]) => void = () =>
      undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof intersect) {
          intersect = callback;
        }
        observe() {
          intersect([{ isIntersecting: false }]);
        }
        disconnect() {
          /* observer cleanup */
        }
      }
    );
    let reduce = false;
    let motionChange = () => undefined;
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduce;
      },
      addEventListener: (_: string, callback: typeof motionChange) => {
        motionChange = callback;
      },
      removeEventListener: vi.fn(),
    }));
    render(<FeaturedContent onOpenCanvas={vi.fn()} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/1 \/ 5/)).toBeTruthy();
    act(() => intersect([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/2 \/ 5/)).toBeTruthy();
    act(() => {
      reduce = true;
      motionChange();
    });
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText(/2 \/ 5/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: '暂停自动浏览精选内容' })
    ).toBeNull();
  });

  it('shows five content cards and moves the center card with navigation', () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    render(<FeaturedContent onOpenCanvas={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: /^查看/ })).toHaveLength(5);
    expect(screen.getByText('创作画布更新')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '下一条精选内容' }));

    expect(screen.getByText('东方留白')).toBeTruthy();
    expect(screen.getByText(/2 \/ 5/)).toBeTruthy();
  });

  it('opens the selected item detail and can hand it to the canvas', () => {
    const openCanvas = vi.fn();
    const showModal = vi.fn();
    HTMLDialogElement.prototype.showModal = showModal;
    render(<FeaturedContent onOpenCanvas={openCanvas} />);

    fireEvent.click(screen.getByRole('button', { name: '查看批量生图' }));
    expect(showModal).toHaveBeenCalledOnce();
    const primary = document.querySelector('.featured-content__primary');
    expect(primary).toBeTruthy();
    if (primary) fireEvent.click(primary);
    expect(openCanvas).toHaveBeenCalledOnce();
  });

  it('replaces the guide with the bundled release and shows categorized details', () => {
    vi.stubGlobal('__HOME_RELEASE_HIGHLIGHTS__', {
      version: '1.2.0', date: '2026-10-17',
      groups: [
        { title: '新增功能', items: ['支持更多图片模型'] },
        { title: '问题修复', items: ['恢复已保存的项目'] },
      ],
    });
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    render(<FeaturedContent onOpenCanvas={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /^查看/ })).toHaveLength(5);
    expect(screen.queryByText('创作画布更新')).toBeNull();
    expect(screen.getByText('支持更多图片模型')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看OpenTu v1.2.0' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('heading', { name: '新增功能' })).toBeTruthy();
    expect(dialog.getByRole('heading', { name: '问题修复' })).toBeTruthy();
    expect(dialog.getAllByRole('listitem').map((item) => item.textContent))
      .toEqual(['支持更多图片模型', '恢复已保存的项目']);
    expect(dialog.getByText('版本更新 · 2026-10-17')).toBeTruthy();
  });

  it('keeps log markup as text rather than executing it', () => {
    const text = '<img src=x onerror="alert(1)">';
    vi.stubGlobal('__HOME_RELEASE_HIGHLIGHTS__', {
      version: '1.2.0', date: '2026-10-17',
      groups: [{ title: '问题修复', items: [text] }],
    });
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    render(<FeaturedContent onOpenCanvas={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '查看OpenTu v1.2.0' }));
    expect(screen.getByRole('listitem').textContent).toBe(text);
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('keeps the generic guide when the build has no eligible release', () => {
    vi.stubGlobal('__HOME_RELEASE_HIGHLIGHTS__', null);
    render(<FeaturedContent onOpenCanvas={vi.fn()} />);
    expect(screen.getByRole('button', { name: '查看创作画布更新' })).toBeTruthy();
    expect(screen.queryByText('版本更新')).toBeNull();
    expect(screen.getByText('产品指南', { selector: '.featured-content__badge' })).toBeTruthy();
  });
});
