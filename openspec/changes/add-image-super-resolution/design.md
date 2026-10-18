# Design

## Service Boundary

The website gateway handles user authorization, ownership and request budgets. A separate internal Real-ESRGAN service handles inference and temporary outputs. The browser never receives the service bearer token. A third-party implementation can use the same browser contract if that deployment option is selected.

Server deployment location remains pending. Start with an isolated local integration using the available source/service; measure source-specific latency, memory and output quality before offering automatic enhancement in production. Keep generation API calls unchanged and upload already-created image bytes to the enhancement service.

## Processing Lifecycle

Source stored -> enhancement requested -> queued -> processing -> result downloaded and stored -> enhanced rendition ready.

Source generation and enhancement have distinct failure states. An enhancement failure must not turn a completed source generation into an unavailable image or replay a paid generation request. Stable request identity includes source identity and enhancement settings; retries resume the same remote job when possible. Result persistence must finish before announcing completion.

Preserve the original, actual source/output dimensions, selected algorithm and parameters. Browser canvas dimensions describe layout and remain independent of pixel dimensions. Media previews use thumbnails; download/inspection uses the selected full-resolution rendition. Task tracking and storage must support refresh, navigation between canvases and cancellation.

## Dimensions And Quality

Specify exact long-edge targets instead of forwarding the old service's ambiguous `4K` preset. For 1024x1024, 4096x4096 is a supported 4x output. Rectangular images preserve ratio; an input below 1024 on its longest edge cannot reach 4096 in one <=4x pass. Already-large images should not be silently shrunk or unnecessarily inferred. Return actual dimensions and reject unsupported targets.

Photo model: RealESRGAN_x4plus. Anime/illustration model: RealESRGAN_x4plus_anime_6B. Face enhancement remains disabled by default. Evaluate text, faces, logos, transparency and tile seams with existing fixtures and actual generated images; resolution enlargement does not guarantee restoration of real detail.

## Approved Policy

Reuse Real-ESRGAN locally first, then connect an independent production inference service. Display originals immediately and automatically enhance new generation results in the background; expose manual enhancement too. Do not deploy inference on the current web host. Production remains disabled until an independent endpoint and capacity validation are available.

## Pending Decisions

- GPU/API endpoint and production budget when production enhancement is requested.
