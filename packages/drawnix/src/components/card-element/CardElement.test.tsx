import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardElement } from './CardElement';
import type { PlaitCard } from '../../types/card.types';

const copyToClipboard = vi.hoisted(() => vi.fn());
vi.mock('../../utils/runtime-helpers', () => ({ copyToClipboard }));
vi.mock('../shared/hover', () => ({ HoverTip: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../MarkdownReadonly', () => ({ default: ({ markdown }: { markdown: string }) => <p>{markdown}</p> }));
const card: PlaitCard = { id: 'card', type: 'card', title: '标题', body: '第一段\n第二段', fillColor: '#4A90D9', points: [[0, 0], [400, 300]] };

describe('card text copying', () => {
  beforeEach(() => copyToClipboard.mockReset().mockResolvedValue(undefined));
  afterEach(() => { cleanup(); window.getSelection()?.removeAllRanges(); });
  it('copies the original title and body and reports success', async () => {
    render(<CardElement element={card} />);
    fireEvent.click(screen.getByRole('button', { name: '复制文本内容' }));
    await screen.findByRole('button', { name: '已复制' });
    expect(copyToClipboard).toHaveBeenCalledWith('标题\n\n第一段\n第二段');
  });
  it('does not copy a placeholder title', async () => {
    render(<CardElement element={{ ...card, title: undefined }} />);
    fireEvent.click(screen.getByRole('button', { name: '复制文本内容' }));
    await screen.findByRole('button', { name: '已复制' });
    expect(copyToClipboard).toHaveBeenCalledWith(card.body);
  });
  it('shows clipboard failure and allows another attempt', async () => {
    copyToClipboard.mockRejectedValueOnce(new Error('denied'));
    render(<CardElement element={card} />);
    fireEvent.click(screen.getByRole('button', { name: '复制文本内容' }));
    fireEvent.click(await screen.findByRole('button', { name: '复制失败，请重试' }));
    await screen.findByRole('button', { name: '已复制' });
    expect(copyToClipboard).toHaveBeenCalledTimes(2);
  });
  it.each([true, false])('copies selected text without canvas shortcuts (meta=%s)', metaKey => {
    const canvasKey = vi.fn();
    render(<div onKeyDown={canvasKey}><CardElement element={card} /></div>);
    const paragraph = screen.getByText(/第一段/);
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.addRange(range);
    fireEvent.keyDown(paragraph.closest('[tabindex]')!, { key: 'c', metaKey, ctrlKey: !metaKey });
    expect(copyToClipboard).toHaveBeenCalledWith(window.getSelection()?.toString());
    expect(canvasKey).not.toHaveBeenCalled();
  });
  it('keeps copy pointer events from starting a canvas drag', () => {
    const canvasPointer = vi.fn();
    render(<div onPointerDown={canvasPointer}><CardElement element={card} /></div>);
    fireEvent.pointerDown(screen.getByRole('button', { name: '复制文本内容' }));
    expect(canvasPointer).not.toHaveBeenCalled();
    expect(copyToClipboard).not.toHaveBeenCalled();
  });
  it('preserves the knowledge base action', () => {
    const listener = vi.fn();
    window.addEventListener('kb:open', listener);
    render(<CardElement element={{ ...card, noteId: 'note' }} />);
    fireEvent.click(screen.getByRole('button', { name: '打开知识库笔记' }));
    expect(listener.mock.calls[0][0].detail).toEqual({ noteId: 'note' });
    window.removeEventListener('kb:open', listener);
  });
});
