# Design: 独立 tldraw 创作体验壳

## Context

OpenTu 已具备成熟的工作区初始化、画布持久化、Tuzi Provider 同步、动态模型发现、`ModelRef` 路由和按模型作用域保存参数的能力。若新版本复制模型目录或生成调用，会造成同名模型来源丢失、参数漂移和两条生成链路长期分叉。

## Goals

- 灰度期默认旧版本，用户可明确切换并持久化偏好
- 新版本首屏提供更聚焦的创作起点，并进入独立的 tldraw 创作画布
- 模型和参数能力与现有 AI 输入栏保持同源
- 同一模型 ID 在不同 Provider 下仍通过 `ModelRef` 精确路由
- 进入画布后由新版输入栏承接提交，底层复用既有 task queue 和 Provider 路由
- 桌面与移动端均无内容重叠，并保持高频操作可扫描、可触达

## Non-Goals

- 不修改 Tuzi 凭据 fragment 的消费与清理时序
- 不修改 Tuzi 分组选择或托管 Provider 同步规则
- 不新建生成 API 或 Provider 路由；tldraw 仅新增独立场景存储
- 一期不实现公共作品库、审核后台或纯本地“精选”状态
- 不删除旧版本实现

## Architecture

### Experience state

App 初始化完成后读取独立的体验偏好键。缺失或非法值回退为 `legacy`。切换只控制展示层：

- `legacy`：直接渲染现有 Drawnix
- `new/home`：渲染方案 A 首页
- `new/canvas`：渲染独立 tldraw 画布，并显示返回新首页和版本切换入口

版本切换不会创建、迁移或复制旧版画布。新版使用独立的 tldraw persistence key 保存 tldraw store；旧版 Drawnix 仍由现有 `onChange`、viewport 防抖和关闭快照机制保存。

### Shared model controls

新首页组件放在 `packages/drawnix` 内部，以直接复用：

- `ModelDropdown` 的 Provider 分组、Tuzi 托管模型懒发现和 `ModelRef`
- `ParametersDropdown` 与 `getCompatibleParams`
- `IMAGE_MODELS`、`VIDEO_MODELS`、`AUDIO_MODELS`、`TEXT_MODELS`
- AI 生成偏好中的默认模型、模型来源和按模型作用域参数

组件不维护模型 ID 白名单的副本。生成类型变化时选用该类型的共享模型集合；模型变化时重新读取该模型的兼容参数，清除不支持值并恢复有效默认值。

### Canvas handoff

用户点击“进入画布”后：

1. App 将新版本视图切换为画布。
2. tldraw 画布挂载完成后，新首页通过 `requestAIInputPrefill` 发送一次回填。
3. 新版 tldraw 画布输入栏展示 `generationType`、`prompt`、`model`、`modelRef` 和过滤后的 `params`。
4. 用户提交后调用既有 `taskQueueService`，共享任务状态驱动任务面板，并在 tldraw 场景中插入提示词/结果卡片。

### Canvas isolation

新版使用 `opentu-new-canvas-v1:<boardId|local>` 作为 tldraw persistence key。它只保存 tldraw store，不参与旧版 `PlaitElement[]` 的 workspace snapshot；版本切换不会复制或迁移任一方的画布数据。结果节点以任务 ID 写入 tldraw shape metadata，避免重新进入画布时重复插入。

若事件早于监听器挂载，App 在画布完成初始化后再派发，且每次启动只派发一次。

### Publication boundary

公开发布与申请精选需要 Tuzi 服务端提供作品身份、权限、审核状态和资产可访问性。第一阶段页面不显示可产生错误预期的成功发布操作。后续契约应支持：

`draft -> pending_review/public -> featured/rejected`

## Risks And Mitigations

- **动态模型尚未发现**：继续使用现有下拉框的 Tuzi Provider 懒加载逻辑和加载态。
- **同名模型路由错误**：状态同时保存模型 ID 与 `ModelRef`，不可只传 ID。
- **参数跨模型污染**：每次模型变化通过共享兼容定义清洗，不支持参数不进入回填。
- **切换页面丢画布**：新版由 tldraw persistence key 恢复，旧版继续依赖实时保存与关闭快照。
- **首页与画布 UI 风格冲突**：版本工具条由 App 壳统一提供，新首页使用独立命名空间样式。
