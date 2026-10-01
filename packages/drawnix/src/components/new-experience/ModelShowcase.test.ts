import { describe, expect, it } from 'vitest';
import { ModelVendor, type ModelConfig } from '../../constants/model-config';
import { selectShowcaseModels } from './showcase-models';

function model(id: string, overrides: Partial<ModelConfig> = {}): ModelConfig {
  return {
    id,
    label: id,
    type: 'image',
    vendor: ModelVendor.GPT,
    ...overrides,
  };
}

describe('selectShowcaseModels', () => {
  it('puts tagged new models ahead of older aliases on the homepage', () => {
    const models = [
      model('legacy-image', { recommendedScore: 99 }),
      model('new-image', {
        vendor: ModelVendor.GEMINI,
        tags: ['new'],
        recommendedScore: 82,
      }),
      model('new-image-2', {
        vendor: ModelVendor.QWEN,
        tags: ['new'],
        recommendedScore: 81,
      }),
    ];

    expect(selectShowcaseModels(models).map((item) => item.id)).toEqual([
      'new-image',
      'new-image-2',
      'legacy-image',
    ]);
  });

  it('uses recommendation score within the same recency tier and keeps provider diversity', () => {
    const models = [
      model('new-gpt-lower', { tags: ['new'], recommendedScore: 80 }),
      model('new-gpt-higher', { tags: ['new'], recommendedScore: 90 }),
      model('new-gemini', {
        vendor: ModelVendor.GEMINI,
        tags: ['new'],
        recommendedScore: 85,
      }),
    ];

    expect(selectShowcaseModels(models).map((item) => item.id)).toEqual([
      'new-gpt-higher',
      'new-gemini',
      'new-gpt-lower',
    ]);
  });
});
