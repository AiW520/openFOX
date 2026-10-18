## Context
The vendored infinite canvas contains host-specific model routing, media leases, durable task identities, mobile drawers and enhancement requests. Upstream patches provide behavior to adapt rather than files to replace.

## Decisions
- Keep protocol-specific MIME normalization in the current Gemini converter and preserve image order and bytes.
- Reuse the card clipboard/selection helpers. Keep stored card dimensions and the chosen canvas palette.
- Observe the canvas only after its container mounts; size observation must not reset the restored viewport. Measure visible UI at focus time, and reuse the existing animation duration and zoom bounds. Respect reduced motion and cancel obsolete focus animations.
- Render creation menus in screen coordinates inside the canvas surface, retaining world positions for node creation. Counter-scale only desktop node panels; mobile editing remains in its drawer.
- Copy static outputs with fresh output-slot identities and without active generation/video/enhancement request identities. Keep only valid incoming references within the same project, remapping copied sources.
- Treat unknown quota as unknown. IndexedDB content statistics remain available independently of browser storage estimation.
- Completed-task recovery retries only local postprocessing using the existing result. Failed/cancelled generation remains an explicit regeneration action. Preserve task ownership and prevent repeated insertion.

## Risks / Trade-offs
- Focus and zoom interact with overlays: geometry tests and isolated desktop/mobile browser checks cover framing and event behavior.
- Copying active outputs must never subscribe the duplicate to the original task or automatically submit paid work.
- Result recovery must retain task result and original route identity, while ignoring deleted, replaced or out-of-scope targets.
- No unapproved behavioral timeout or automatic retry limits are introduced.

## Validation
Use focused mocked regression tests for image conversion, clipboard failures, copy/reference identity, viewport geometry, quota fallback and completed-result recovery. Verify UI with an isolated browser context and existing local dev server; do not operate the user's browser storage or send provider generation requests. No production build is required by this batch.
