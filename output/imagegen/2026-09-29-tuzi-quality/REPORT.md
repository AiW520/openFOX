# Tuzi GPT Image 2.5 实测记录

日期：2026-09-29。地址：https://api.tu-zi.com/v1/images/generations 。模型：`gpt-image-2.5`。所有请求 `n=1`、`response_format=b64_json`，无客户端质量映射、重采样或放大。未保存 API Key。

| 请求 quality | 请求尺寸 | HTTP | 原始 PNG 实际尺寸 | 耗时 | 日志计费 USD |
| --- | --- | --- | --- | --- | --- |
| xhigh | 3840×2160 | 502 | 无图片 | 6.798 秒 | 0 |
| max | 3840×2160 | 502 | 无图片 | 5.765 秒 | 0 |
| xhigh | 1024×1024 | 200 | 1024×1024 | 51.018 秒 | 0.30 |
| max | 1024×1024 | 200 | 1024×1024 | 98.443 秒 | 0.30 |
| xhigh | 2304×1536 | 200 | 2304×1536 | 85.072 秒 | 0.30 |

## 结论与证据边界

- 1K 的 xhigh/max 均成功返回，2K（本项目 3:2 尺寸表为 2304×1536）的 xhigh 成功返回；原始图片像素尺寸准确。
- **无法确认实际执行质量档位与请求一致。** 成功响应只包含 `created`、`data`、`usage`，图片条目只有 `b64_json`，PNG 未包含质量档位元数据。日志中的 `image_request` 记录请求/上游/有效尺寸，却没有 quality。三次成功请求的账单文案均显示“品质 standard”。这可能是账单默认文案，也可能是参数透传问题，不能据此证明已降档或未降档；需要核对服务端转发的 quality 和上游实际执行记录。
- 同提示词 1K 对照：xhigh 输出 6065 tokens，max 输出 8113 tokens，输入均为 116 tokens。耗时和 token 数量差异不能单独证明档位真实生效；每档只有一张且未固定种子，也不能据此定量比较质量。
- 两次 4K 均报 `upstream_error / Upstream service temporarily unavailable`。后续状态查询均为 failed，失败日志 quota=0。只能说明本次 4K 请求失败，不能证明服务普遍不支持 4K。
- 2K 日志 requested/upstream_request/effective 均为 2304×1536、tier=2，routing strict、allow_image_size_downgrade=false、selected_channel_limit=2。1K 的 selected_channel_limit=1 是当次路由记录，不能解释为此 Key 全局只能使用 1K。
- 未测试 low/medium/high、3K、图像编辑、文字与编辑一致性。公告“全参数、1–4K、各档质量均生效”未获完整验证。
- 三次成功请求均按次计费 0.30 美元，总计 0.90 美元。

## 请求追踪 ID（与上表同序）

1. `202609290343114782693358268d9d6UgoCYS6O`
2. `202609290343104818798838268d9d6fTlWrBtX`
3. `202609290345329158046918268d9d6tl6zXhPV`
4. `202609290345329291196688268d9d6ydRzRbh4`
5. `202609290349057652188008268d9d6BzgRYJ8k`

## 图片与用途

- `still-life-xhigh.png` / `still-life-max.png`：同提示词原始 1K 对照图。
- `editorial-sheet-xhigh-2k.png`：原始 2304×1536 六宫格。
- 六宫格按等分 768×768 无缩放裁切，WebP quality=86、method=6，共 582580 字节，位于 `packages/drawnix/src/components/new-experience/assets/`。工作室、青山、香水、海岸、灵感卡片、蝴蝶用于新首页精选内容及模型墙。
- WebP 的编码 quality=86 与模型生成 quality 无关。模型墙封面是装饰性图片，不能作为其他模型的实际输出样张；悬停说明已注明来源。

## 独立模型墙封面补图

用户反馈模型卡片重复后，使用同一 API、`gpt-image-2.5`、`xhigh`、2304×1536 生成两张新的 3×2 六宫格，每格裁成一张 768×768 WebP。主题共 12 个：海边白色别墅、锦鲤、沙漠汽车、紫色茶具、人像、雪山、发光水母、森林列车、露珠大丽花、俯拍帆船、耳机、雨夜街道。两次均 HTTP 200、原图尺寸准确、各计费 $0.30；本次补图合计 $0.60。

模型墙现在在两排之间统一分配 12 张独立封面；同一模型的自动滚动副本复用自己的封面，模型排序变化也不会换图。封面仍是装饰性视觉，不代表对应模型的实测输出。

## 同提示词 1K 对照

Use case: product-mockup. An exquisite editorial photograph for a refined creative-workstation homepage: a sculptural frosted seafoam glass perfume bottle and one ripe apricot on pale travertine, soft side sunlight, beautiful translucent caustics, delicate water droplets, sharply resolved material detail, warm ivory backdrop, restrained luxury art direction, centered composition that crops beautifully to landscape, no label, no text, no logos, no watermark.

## 六宫格提示词（4K 失败与 2K 成功请求一致）

Use case: ads-marketing. Create an exquisite editorial contact sheet for a refined creative-workstation website. The final image must be an EXACT seamless 3-column by 2-row grid of six equally sized rectangular photographs, zero gutters, zero frames, no typography, no letters, no watermarks, no brand logos. Every scene fills its entire cell, with its main subject centered for safe thumbnail cropping. Each cell is a separate professional art-directed image, cohesive natural light, subtle film texture, believable fine detail, sophisticated restrained colors, visually rich yet calm. Top left: a sunlit sculptural cream-stone artist studio, curved desk, closed silver laptop, translucent glass and a single branch, soft blue-gray daylight. Top middle: poetic Chinese landscape, layered jade mountains and mist reflected in a still lake, tiny warm pavilion, painterly yet photographic aerial composition. Top right: luxury editorial still life, sculptural frosted seafoam perfume bottle and ripe apricot on travertine, extraordinary translucent glass, delicate water droplets, side sunlight. Bottom left: cinematic quiet coastal road curling between ocean cliffs at golden hour, tiny ivory vintage car, wind-shaped grass, inviting travel film still. Bottom middle: overhead composition of six fine-art print cards fanned across warm paper, botanical and landscape artworks, elegantly organized creative moodboard with no readable text. Bottom right: macro portrait of an iridescent blue butterfly on a white blossom, exquisite wing scales and pollen, cinematic shallow depth of field. Absolutely preserve the exact equal 3x2 grid; no image spans multiple cells. No fake interface, no generic glowing AI symbols. Render at the requested pixel dimensions.
