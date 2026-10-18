# Change: Improve workbench entry and canvas transitions

## Why

The current application uses null Suspense fallbacks for the home and both canvas entry points. Switching to an unloaded editor can remove the current editor before its replacement appears. Repeated switches also remount the editor and its providers.

An isolated local development sample measured 3.25 seconds from clicking Infinite canvas to its visible canvas surface on desktop, including about 1.64 seconds with neither canvas nor a loading status. Repeat desktop switches took 0.39-0.76 seconds. These are empty-document development measurements, not production benchmarks or full interaction-readiness measurements.

## What Changes

Approved option A:

- Share cached editor-module loaders between React lazy entries and explicit preloading. Begin loading the selected entry early without delaying authentication or the currently usable screen.
- Preload the intended editor on pointer or keyboard intent. Evaluate bounded idle preloading only after the active screen is ready, respecting save-data and slow connections.
- Keep the active screen visible while a destination module loads. Show restrained switching feedback, and commit navigation only for the latest requested destination.
- Provide a themed loading shell during direct entry and document hydration, with explicit loading/error states instead of an empty fallback.
- Assess the unopened workflow task panel's static dependency cost and defer it only where measurements justify the change.
- Measure before/after startup and transition behavior with the same environment and data. Preserve current navigation, persistence, media display, provider authentication and task recovery behavior.

Option B adds retention of both mounted editors after first use. It requires a separate approved lifecycle design for hidden subscriptions, keyboard handlers, plugins, resize handling and background work.

## Approval Status

The user explicitly selected option A in response to this proposal. Implementation is authorized for that scope. Option B is not selected.

## Impact

- Affected specs: workbench-loading (new delta), existing release-safe-static-loading and historical startup-performance loading boundaries.
- Affected code: apps/web/src/app/app.tsx, its styles and transition hook/tests; the home and toolbar preload intent markers; shared cached loaders; and the workflow host, route loader and restoration/loading shells.
- No new dependency, persistent-data migration, credential handling change or paid generation request is planned.
- No production build, deployment, commit or push was performed during assessment.
- Coordinate with optimize-browser-startup-memory, refactor-startup-shell-loading and optimize-infinite-canvas-loading; preserve their existing resource and recovery guarantees.
