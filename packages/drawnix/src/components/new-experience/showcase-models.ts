import type { ModelConfig } from '../../constants/model-config';
import { compareModelsByDisplayPriority } from '../../utils/model-sort';

export function showcaseSelectionKey(model: ModelConfig) {
  return (
    model.selectionKey ||
    (model.sourceProfileId ? `${model.sourceProfileId}::${model.id}` : model.id)
  );
}

// Keep the small secondary shelf useful across providers instead of filling
// it with several variants of the highest-ranked text model.
export function selectAdditionalShowcaseModels(
  textModels: ModelConfig[],
  audioModels: ModelConfig[]
) {
  const vendors = new Set<string>();
  const text = selectShowcaseModels(textModels)
    .filter((model) => {
      if (model.type !== 'text' || vendors.has(model.vendor)) return false;
      vendors.add(model.vendor);
      return true;
    })
    .slice(0, 4);
  return [
    ...text,
    ...selectShowcaseModels(audioModels)
      .filter((model) => model.type === 'audio')
      .slice(0, 2),
  ];
}

// Only interpret version numbers for known catalog families. Do not mistake a
// resolution, date suffix, or an unrelated custom model's number for a release.
function familyVersion(model: ModelConfig) {
  const match = model.id
    .toLowerCase()
    .match(
      /^(?:doubao-|bfl-)?(seedream|seedance|gpt-image|gemini|flux|veo|qwen-image|happyhorse|sora)-?v?(\d+(?:[.-]\d{1,2})?)(?=-|$)/
    );
  return {
    family: `${model.type}:${model.vendor}:${match?.[1] || model.id}`,
    version: match ? match[2].split(/[.-]/).map(Number) : [],
  };
}

function compareVersion(left: number[], right: number[]) {
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (right[index] || 0) - (left[index] || 0);
    if (difference) return difference;
  }
  return 0;
}

function score(model: ModelConfig) {
  return Number.isFinite(model.recommendedScore)
    ? Number(model.recommendedScore)
    : 0;
}

export function selectShowcaseModels(models: ModelConfig[]) {
  const groups = new Map<string, ModelConfig[]>();
  const seen = new Set<string>();
  for (const model of models) {
    const key = showcaseSelectionKey(model);
    if (seen.has(key) || score(model) < 0) continue;
    seen.add(key);
    const { family } = familyVersion(model);
    const group = groups.get(family) || [];
    group.push(model);
    groups.set(family, group);
  }

  const families = [...groups.values()]
    .map((group) => {
      const byVersion = [...group].sort((left, right) =>
        compareVersion(
          familyVersion(left).version,
          familyVersion(right).version
        )
      );
      const newestVersion = familyVersion(byVersion[0]).version;
      const latest = byVersion
        .filter(
          (model) =>
            compareVersion(familyVersion(model).version, newestVersion) === 0
        )
        .sort(compareModelsByDisplayPriority);

      return {
        latest,
        // Carry the family's existing recommendation to its newest generation.
        // These are site recommendations, not measured global popularity.
        score: Math.max(...group.map(score)),
        isNew: latest.some((model) => model.tags?.includes('new')),
      };
    })
    .sort(
      (left, right) =>
        Number(right.isNew) - Number(left.isNew) ||
        right.score - left.score ||
        compareModelsByDisplayPriority(left.latest[0], right.latest[0])
    );

  // First show one current model per series; extra variants follow. Always
  // return the original config so selecting a card retains its provider route.
  return [
    ...families.map(({ latest }) => latest[0]),
    ...families.flatMap(({ latest }) => latest.slice(1)),
  ].slice(0, 12);
}
