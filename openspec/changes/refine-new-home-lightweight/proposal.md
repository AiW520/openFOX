# Change: 清爽工作台首页与站点介绍分享

## Why
新版首页步骤提示、重复画布入口与大图卡片占用空间。用户已在当前会话选择方案 1（清爽工作台），并授权调整主题颜色；此前明确分享的是站点介绍而非协作邀请。

## What Changes
- Approved follow-up (2026-09-28): implement the user's selected B photo-wall layout, with image models always above video models, no category toggle, and a compact area for configured text/Agent and audio recommendations. Use rounded illustrated cards and slow opposite motion, with pause, reduced-motion, offscreen and keyboard/touch handling. Preserve provider-aware selection without generating.
- Approved follow-up (2026-09-27): expose the existing prompt optimizer from the new-home composer and support Enter to hand off its draft to the new canvas; Shift+Enter inserts a newline and IME confirmation never navigates.
- Latest approved refinement (2026-09-27): replace the three new-home starter cards with a horizontal model showcase using selectable image/video models, vendor marks, descriptions and real model selection. Keep the existing homepage composer and rounded neutral styling.
- Replace both native selects on the new canvas topbar with a home button and an explicit segmented version switch; retain legacy layout defaults.
- Only the new canvas replaces the illustrated inspiration board with a compact prompt guide; legacy inspiration remains unchanged. Reuse the existing quantity selector (up to 20), preserving count during canvas handoff. No generation is submitted by these entry actions.
- 单一主输入区、轻量模型参数工具栏、三个小型灵感卡片。
- 按用户后续反馈采用苹果简约工作台方向：灰白背景、单色图标、主要操作使用蓝色，输入区 28px 圆角与胶囊按钮。保留 Provider、ModelRef、任务队列与 Excalidraw 回填链路。
- 修正灵感卡片的内层滚动目标，并尊重减少动态效果设置。
- 站点分享弹窗链接到独立静态介绍页，链接不含画板查询参数或凭据片段。

## Impact
- Affected specs: new-creation-home
- Affected code: NewExperienceHome.tsx, new-experience.scss, app.module.scss, public/about.html
- 不新增依赖，不改变存储或生成调用；上线公网仍需独立部署。

## Approval
用户在当前会话回复“1，也可以换一下主题颜色什么的”，确认此前展示的方案 1；本变更记录该已批准范围。
