import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteShare, SITE_SHARE_URL, TUZI_SITE_URL } from './site-share';

vi.mock('../../i18n', () => ({ useI18n: () => ({ language: 'zh' }) }));

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard'
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
  if (originalClipboard)
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});

function openShare() {
  render(<SiteShare container={document.body} />);
  fireEvent.click(screen.getByTestId('workbench-share'));
}

describe('site promotion sharing', () => {
  it('copies the public entry and introduction without the current private URL', async () => {
    window.history.replaceState(
      {},
      '',
      '/?board=private-board&conversation=private-chat'
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    openShare();
    fireEvent.click(screen.getByRole('button', { name: '复制介绍和链接' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const text = writeText.mock.calls[0][0];
    expect(text).toContain(SITE_SHARE_URL);
    expect(text).toContain(TUZI_SITE_URL);
    expect(text).toContain('兔子 API');
    expect(text).not.toMatch(
      /private-board|private-chat|localhost|127\.0\.0\.1/
    );
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('已复制')
    );
    expect(
      screen.getByRole('link', { name: /打开工作台/ }).getAttribute('target')
    ).toBe('_blank');
  });

  it('selects the exact requested text if an embedding host blocks clipboard access', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi
          .fn()
          .mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
      },
    });
    openShare();
    fireEvent.click(screen.getByRole('button', { name: '复制介绍和链接' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('内容已选中')
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
    expect(textarea.value).toContain(SITE_SHARE_URL);
    expect(screen.getByRole('status').textContent).not.toContain('已复制');
  });
});
