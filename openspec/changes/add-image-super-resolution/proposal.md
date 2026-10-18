# Change: Integrate Image Super Resolution

## Why

OpenTu should process generated or uploaded images through the existing Real-ESRGAN service and display higher-resolution results in either canvas. Workflow Canvas currently exposes interpolation-based enlargement and an unimplemented AI super-resolution action.

## Evidence

- Source service: `D:/图片超分`, repository https://github.com/AiW520/Real-ESRGAN.
- The referenced conversation records authenticated submission, progress, cancellation, downloads and persistent request deduplication, plus local CPU inference validation. This is evidence of service feasibility, not OpenTu integration or production GPU performance.
- Current OpenTu production host has 2 CPU cores, approximately 1.6 GiB total RAM and no NVIDIA GPU. The service estimates over 512 MiB available memory for inference before image buffers; the host currently has approximately 479 MiB available. Running inference there needs separate capacity validation and is unsuitable for default multi-user processing.
- Existing service CPU measurements include 960x540 to 3840x2160 in approximately 381 seconds. These measurements do not predict throughput on the production host.
- Its `4K` preset preserves aspect ratio with an 8.3 MP limit, yielding 2880x2880 for square images. Explicit dimensions or 4x scale can produce 4096x4096 from 1024x1024 within its current output limits.

## Proposed Behavior

- Reuse the existing service through OpenTu's server gateway; keep the service token server-side.
- Share one post-processing client and task lifecycle between Free Canvas and Workflow Canvas.
- Preserve the source image and store the enhanced result as a related rendition with actual dimensions.
- Offer manual enhancement of existing images, with automatic enhancement of newly generated images subject to the user's selected policy.
- Preserve aspect ratio and offer 2x / 4x or explicit 2K / 4K long-edge targets, capped by source size, 4x model limits and resource budgets. Never silently stretch an image or label interpolation as AI super resolution.
- Show an original preview while enhancement is queued/running, then show the completed rendition. A strict wait-for-enhancement display policy is available as an alternative requiring user selection.
- On enhancement failure or cancellation, retain the original and retry only enhancement. Never regenerate the source image automatically.
- Persist job identity and source/result relationships so reload can resume tracking. Transfer completed results into OpenTu-owned storage before service TTL expiration.
- Use bounded uploads and queues, authenticated task ownership, stable request IDs and progress polling. Upload image bytes instead of fetching arbitrary user-supplied URLs on the server.
- Use thumbnails for canvas rendering and full resolution for inspection/download, avoiding full 4K decoding for every node.

## Options Requiring User Selection

| Deployment | Complexity | Runtime performance | Extensibility | Maintenance | Pitfalls |
| --- | --- | --- | --- | --- | --- |
| A: Reuse Real-ESRGAN as a separate inference service; integrate and validate locally first, then deploy on a GPU host | Medium | CPU slow; GPU requires real benchmark | Add photo/anime models and image post-processing | Manage Python, weights and inference host | Additional host required for practical multi-user operation; AI can alter text/faces |
| B: Integrate a third-party super-resolution API | Low to medium | Provider-dependent; not measured | Adapter supports additional providers | Less model-host operations | Requires provider selection, credentials, pricing and image privacy review |
| C: Run CPU inference on the existing web host | Medium | Minutes per image; competes with web traffic | Limited capacity | Resource and queue tuning | Current memory headroom below inference estimate; risks slowing or exhausting the web host |

The user approved A: local integration first, independent production inference, original-first automatic enhancement and manual actions. Production inference endpoint and capacity validation remain pending.

## Impact

- New capability: image-super-resolution.
- Publisher gateway, shared task/media infrastructure, canvas image actions and generated image post-processing.
- Generation provider configuration remains separate from enhancement configuration; API keys and inference tokens remain private.
- No automatic paid source-image generation is needed to validate enhancement.
