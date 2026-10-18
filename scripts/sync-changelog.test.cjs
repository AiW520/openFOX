const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseChangelog } = require('./sync-changelog.js');

test('embedded Unreleased sections cannot leak into the preceding release', () => {
  const result = parseChangelog(`## Unreleased
- [新增] Work in progress at the top
## 1.2.0 (2026-10-17)
### Features
- Released image generation
## Unreleased
### Fixes
- Unreleased security update
## 1.1.0 (2026-10-10)
### Fixes
- Restore the saved canvas
`);
  assert.deepEqual(result.versions.map((item) => item.version), ['1.2.0', '1.1.0']);
  assert.deepEqual(result.versions[0].changes, {
    features: ['Released image generation'], fixes: [], improvements: [],
  });
  assert.doesNotMatch(JSON.stringify(result), /Work in progress|Unreleased security/);
});

test('published Chinese category tags work without subsection headings', () => {
  const result = parseChangelog(`## 1.2.0 (2026-10-17)
- [新增] 支持新的图片模型
- [修复] 恢复已保存的项目
- [调整] 更新画布切换入口
- [优化] 提高图片加载速度
`);
  assert.deepEqual(result.versions[0].changes, {
    features: ['支持新的图片模型'],
    fixes: ['恢复已保存的项目'],
    improvements: ['更新画布切换入口', '提高图片加载速度'],
  });
});

test('withdrawal status remains available to consumers', () => {
  const result = parseChangelog(`## 1.2.0 (2026-10-17)
> **撤回说明：** 该版本已撤回
### Features
- Released image generation
`);
  assert.equal(result.versions[0].status, 'withdrawn');
});

test('commit metadata and internal-only changes stay out of the public feed', () => {
  const result = parseChangelog(`## 1.2.0 (2026-10-17)
### Features
- Support image generation ([abc1234](https://example.com/commit/abc1234))
### Chores
- docs: update developer instructions
- test: extend fixtures
### Thank You
- A contributor
`);
  assert.deepEqual(result.versions[0].changes, {
    features: ['Support image generation'], fixes: [], improvements: [],
  });
});
