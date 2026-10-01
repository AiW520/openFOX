# Change: 将新版创作画布迁移到 Excalidraw

## Why

新版当前使用的 tldraw 场景只有基础示例卡片，视觉、工具栏和 AI 结果呈现都不足以支撑 OpenTu 的创作工作流。GitHub 上成熟的 Excalidraw 提供 MIT 许可证和完整的白板交互，可以作为新版画布的交互基础。

## What Changes

- 将新版画布渲染引擎从 tldraw 替换为 Excalidraw
- 保留 OpenTu 现有模型选择、Provider 路由、任务队列和生成输入栏
- 将提示词、图片、视频、音频和文案任务结果写入 Excalidraw 场景
- 按当前 board ID 隔离 Excalidraw 场景持久化
- 保留旧版 Drawnix/Plait 画布和已有工作区数据
- 清理新版 tldraw 依赖、样式和场景初始化代码

## Impact

- Affected specs: `experience-versioning`, `new-creation-home`, `model-selection-parity`
- Affected code: `packages/drawnix/src/components/new-experience/NewCreativeCanvas.tsx`, `new-creative-canvas.scss`, `new-creative-canvas-utils.ts`, workspace dependency manifests
- Migration: existing tldraw scene data is not modified; the new Excalidraw scene uses a separate storage namespace
