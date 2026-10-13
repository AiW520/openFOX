## Context

NewCanvasHost is the active new-canvas entry. WorkflowModeHost has no production callers. WorkflowRouter statically imports all pages. The canvas store debounces snapshots for 400ms but serializes all projects for each committed snapshot.

## Decisions

- Use React.lazy for route pages and one Suspense boundary inside the shared layout. Keep provider initialization and navigation semantics intact.
- Load the local assistant panel only when requested, enabled or bootstrapped through the URL, then preserve its mounted session after closing. Defer the configuration modal until opened. Import homepage/settings components directly instead of loading the legacy public barrel.
- Preserve the existing manual chunk policy. An explicit-membership experiment created static chunk cycles and failed production startup validation; it was removed. Check the final production graph before claiming resource improvements.
- Compare fresh browser contexts on the same machine and production preview. Mock only the publisher session discovery with a public model catalog; never submit paid generations in the performance probe. Report this limitation with results.
- Track readiness, loaded asset sizes, requests and screenshots; retain raw results under ignored tmp output.
- Preserve the existing storage schema. Measure serialization for representative project sizes and avoid a database migration without measured need.
- Remove only the unreferenced internal host. Public package exports remain for compatibility.

## Risks

- Lazy pages resolve asynchronously: update navigation tests to await visible destination content.
- Shared dependencies can still be pulled into the canvas chunk: verify production assets and do not infer gains solely from source imports.
- Hydration/index failures must not create silent destructive resets. Preserve project documents and display recoverable errors.
- Local preview timings exclude real network and gateway latency; do not present them as guaranteed remote-user timings.

## Validation

Use typecheck, focused router/storage/provider/task tests, production build and browser screenshots at desktop and mobile sizes. Compare the production browser probe before/after, including reload and batch navigation. No deployment is included in this request.
