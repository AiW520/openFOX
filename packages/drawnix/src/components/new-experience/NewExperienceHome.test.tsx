import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PromptOptimizeDialogProps } from '../shared/PromptOptimizeDialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewExperienceHome } from './NewExperienceHome';
import { ModelVendor } from '../../constants/model-config';
import { requestAIInputPrefill } from '../../services/ai-input-ui-events';

const imageModel = {
  id: 'test-image',
  label: 'Test Image',
  type: 'image' as const,
  vendor: ModelVendor.GPT,
  sourceProfileId: 'test-provider',
  selectionKey: 'test-provider::test-image',
};
const onModelSelect = vi.fn();
const selection = vi.hoisted(() => ({ available: true }));
vi.mock('../shared/PromptOptimizeDialog', () => ({
  PromptOptimizeDialog: (props: PromptOptimizeDialogProps) => (
    <div role="dialog" aria-label="提示词优化" data-scenario={props.scenarioId}>
      <span>{props.originalPrompt}</span>
      <button
        onClick={() => {
          props.onApply('优化后的产品摄影描述');
          props.onOpenChange(false);
        }}
      >
        回填优化结果
      </button>
      <button onClick={() => props.onOpenChange(false)}>取消优化</button>
    </div>
  ),
}));
vi.mock('../../hooks/use-provider-profiles', () => ({
  useProviderProfiles: () => [],
}));
vi.mock('../../services/ai-input-ui-events', () => ({
  requestAIInputPrefill: vi.fn(),
}));
vi.mock('../ai-input-bar/ModelDropdown', () => ({
  ModelDropdown: () => <span>Model picker</span>,
}));
vi.mock('../ai-input-bar/ParametersDropdown', () => ({
  ParametersDropdown: () => null,
}));
vi.mock('../chat-drawer/useChatDrawerGenerationControls', () => ({
  useChatDrawerGenerationControls: () => {
    const [count, setCount] = useState(1);
    const [generationType, setGenerationType] = useState('image');
    return {
      generationType,
      setGenerationType,
      selectedModel: selection.available ? imageModel.id : '',
      selectedModelRef: { profileId: 'test-provider', modelId: imageModel.id },
      selectedSelectionKey: imageModel.selectionKey,
      selectedCount: count,
      setSelectedCount: setCount,
      currentModels: [imageModel],
      imageModels: [imageModel],
      videoModels: [],
      compatibleParams: [],
      selectedParams: { size: 'auto', resolution: '2k', quality: 'high' },
      handleModelSelect: vi.fn(),
      handleParamSelect: vi.fn(),
      handleModelConfigSelect: onModelSelect,
    };
  },
}));

const originalScrollIntoView = Element.prototype.scrollIntoView;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  selection.available = true;
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  if (originalScrollIntoView)
    Element.prototype.scrollIntoView = originalScrollIntoView;
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

describe('new home model and count handoff', () => {
  it('hands the same model and parameters to the free canvas consumer', () => {
    const openCanvas = vi.fn();
    const selectCanvas = vi.fn();
    render(<NewExperienceHome canvasType="legacy" onSelectCanvas={selectCanvas} onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: '创作描述' }), { target: { value: '自由画布草稿' } });
    fireEvent.click(screen.getByRole('button', { name: '打开画布', exact: true }));
    expect(requestAIInputPrefill).toHaveBeenCalledWith(expect.objectContaining({ target: undefined, prompt: '自由画布草稿', model: 'test-image', params: { size: 'auto', resolution: '2k', quality: 'high' }, count: 1 }));
    expect(openCanvas).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '无限画布', exact: true }));
    expect(selectCanvas).toHaveBeenCalledWith('new');
  });
  it('keeps the mobile prompt editable on Enter and hands parameters over on button tap', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const openCanvas = vi.fn();
    const { container } = render(<NewExperienceHome onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />);
    expect(container.querySelector('.new-experience--compact')).toBeTruthy();
    const input = screen.getByRole('textbox', { name: '创作描述' });
    fireEvent.change(input, { target: { value: '手机端草稿' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(openCanvas).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '打开画布' }));
    expect(openCanvas).toHaveBeenCalledOnce();
    expect(requestAIInputPrefill).toHaveBeenCalledWith(expect.objectContaining({ prompt: '手机端草稿', target: 'workflow', params: { size: 'auto', resolution: '2k', quality: 'high' } }));
  });
  it('renders the real count selector and passes 20 images with the provider to the canvas without generating', () => {
    const openCanvas = vi.fn();
    render(
      <NewExperienceHome onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />
    );
    fireEvent.mouseDown(screen.getByRole('button', { name: '1个' }));
    fireEvent.click(screen.getByText('20个', { exact: true }));
    expect(screen.getByRole('button', { name: '20个' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: '创作描述' }), {
      target: { value: '产品摄影' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '带入描述并进入画布' })
    );
    expect(requestAIInputPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 20,
        params: { size: 'auto', resolution: '2k', quality: 'high' },
        target: 'workflow',
        prompt: '产品摄影',
        model: 'test-image',
        modelRef: { profileId: 'test-provider', modelId: 'test-image' },
        source: 'new-experience',
      })
    );
    expect(openCanvas).toHaveBeenCalledOnce();
  });

  it('the canvas shortcut carries a nonempty draft, but still opens directly when empty', () => {
    const openCanvas = vi.fn();
    render(<NewExperienceHome onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />);
    const shortcut = screen.getByRole('button', { name: '打开画布' });
    fireEvent.click(shortcut);
    expect(openCanvas).toHaveBeenCalledOnce();
    expect(requestAIInputPrefill).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: '创作描述' }), {
      target: { value: '保留尺寸和分辨率的草稿' },
    });
    fireEvent.click(shortcut);
    expect(requestAIInputPrefill).toHaveBeenCalledWith(expect.objectContaining({
      prompt: '保留尺寸和分辨率的草稿',
      params: { size: 'auto', resolution: '2k', quality: 'high' },
      count: 1,
      target: 'workflow',
    }));
    expect(openCanvas).toHaveBeenCalledTimes(2);
  });

  it('keeps the prompt when opening the canvas before a model is configured', () => {
    selection.available = false;
    const openCanvas = vi.fn();
    render(<NewExperienceHome onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: '创作描述' }), {
      target: { value: '草稿暂存' },
    });
    fireEvent.click(screen.getByRole('button', { name: '打开画布' }));
    expect(openCanvas).toHaveBeenCalledOnce();
    expect(requestAIInputPrefill).toHaveBeenCalledWith(expect.objectContaining({
      prompt: '草稿暂存', model: undefined, modelRef: null, target: 'workflow',
    }));
  });

  it('Enter carries the prompt, count and provider to the canvas; Shift+Enter and IME confirmation do not', () => {
    const openCanvas = vi.fn();
    render(
      <NewExperienceHome onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />
    );
    const input = screen.getByRole('textbox', { name: '创作描述' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(openCanvas).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: ' 产品摄影\n柔和光线 ' } });
    fireEvent.mouseDown(screen.getByRole('button', { name: '1个' }));
    fireEvent.click(screen.getByText('20个', { exact: true }));
    expect(fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })).toBe(
      true
    );
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(input, { key: 'Enter', repeat: true });
    expect(requestAIInputPrefill).not.toHaveBeenCalled();
    expect(openCanvas).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(openCanvas).toHaveBeenCalledOnce();
    expect(requestAIInputPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '产品摄影\n柔和光线',
        count: 20,
        model: imageModel.id,
        modelRef: { profileId: 'test-provider', modelId: imageModel.id },
        source: 'new-experience',
      })
    );
  });

  it('does not enter from the keyboard when no model is selected', () => {
    selection.available = false;
    const openCanvas = vi.fn();
    render(
      <NewExperienceHome onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />
    );
    const input = screen.getByRole('textbox', { name: '创作描述' });
    fireEvent.change(input, { target: { value: '产品摄影' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(openCanvas).not.toHaveBeenCalled();
    expect(requestAIInputPrefill).not.toHaveBeenCalled();
  });

  it.each([
    ['图片', 'image'],
    ['视频', 'video'],
    ['音频', 'audio'],
    ['文案', 'text'],
    ['Agent', 'agent'],
  ])(
    'opens the shared optimizer for %s and applies its result without navigating',
    async (label, type) => {
      const openCanvas = vi.fn();
      render(
        <NewExperienceHome onOpenCanvas={openCanvas} onOpenSettings={vi.fn()} />
      );
      const input = screen.getByRole('textbox', {
        name: '创作描述',
      }) as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: '产品摄影' } });
      fireEvent.click(
        screen
          .getByRole('group', { name: '创作类型' })
          .querySelectorAll('button')[
          ['Agent', '图片', '视频', '音频', '文案'].indexOf(label)
        ]
      );
      fireEvent.click(screen.getByRole('button', { name: '提示词优化' }));
      const dialog = await screen.findByRole('dialog', { name: '提示词优化' });
      expect(dialog.getAttribute('data-scenario')).toBe(`ai-input.${type}`);
      expect(dialog.textContent).toContain('产品摄影');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(openCanvas).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: '回填优化结果' }));
      expect(input.value).toBe('优化后的产品摄影描述');
      expect(document.activeElement).toBe(input);
      expect(openCanvas).not.toHaveBeenCalled();
      expect(requestAIInputPrefill).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(openCanvas).toHaveBeenCalledOnce();
      expect(requestAIInputPrefill).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: '优化后的产品摄影描述',
          generationType: type,
        })
      );
    }
  );

  it('closing optimization preserves the original draft', async () => {
    render(
      <NewExperienceHome onOpenCanvas={vi.fn()} onOpenSettings={vi.fn()} />
    );
    const input = screen.getByRole('textbox', {
      name: '创作描述',
    }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '保留的草稿' } });
    fireEvent.click(screen.getByRole('button', { name: '提示词优化' }));
    fireEvent.click(await screen.findByRole('button', { name: '取消优化' }));
    expect(input.value).toBe('保留的草稿');
    expect(requestAIInputPrefill).not.toHaveBeenCalled();
  });

  it('selects the full model config from the combined media showcase', () => {
    const onConfigure = vi.fn();
    render(
      <NewExperienceHome onOpenCanvas={vi.fn()} onOpenSettings={onConfigure} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Test Image/ }));
    expect(onModelSelect).toHaveBeenCalledWith(imageModel);
    expect(screen.queryByRole('group', { name: '模型展示类型' })).toBeNull();
    expect(screen.getByRole('region', { name: '图片与视频模型' })).toBeTruthy();
  });
});
