import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
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
});
