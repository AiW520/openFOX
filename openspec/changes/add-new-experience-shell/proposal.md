# Change: 新增独立 tldraw 创作体验与版本切换

## Why

现有 OpenTu 以画布和底部任务栏为主，适合熟悉产品的用户，但缺少面向灵感探索的独立创作入口。新体验需要在不改变 Tuzi 身份、分组、Provider 同步和画布数据链路的前提下，提供更清晰的模型选择、兼容参数配置和进入画布流程，并允许灰度期间随时回到现有实现。

## What Changes

- 新增“旧版本 / 新版本”切换，灰度期首次访问默认旧版本并持久化用户选择
- 新增方案 A“Agent 灵感台”首页，提供创作类型、动态模型、兼容参数、提示词和进入画布入口
- 新首页直接复用现有 Provider、动态模型发现、`ModelRef` 和模型参数定义，不维护第二份静态模型目录
- 从新首页进入画布时，通过既有 AI 输入栏回填事件传递提示词、生成类型、模型来源和兼容参数
- 新版本使用独立 tldraw 画布，旧版 Drawnix 画布保持不变；任务、Provider 和模型路由继续复用现有服务
- 新版画布以独立的 tldraw persistence key 保存场景，按当前工作区隔离，不读取或覆盖旧版 Plait 数据
- 保持 Tuzi URL 凭据消费、系统令牌、分组和 Provider 启动同步链路不变
- 公开发布、申请精选与审核状态仅定义为后续服务端契约，一期不提供纯本地伪发布

## Impact

- Affected specs:
  - `experience-versioning`
  - `new-creation-home`
  - `model-selection-parity`
- Affected code:
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/app/experience-version.ts`
  - `packages/drawnix/src/components/new-experience/*`
  - `packages/drawnix/src/index.ts`
