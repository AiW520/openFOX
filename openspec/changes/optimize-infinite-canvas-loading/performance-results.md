# Canvas Loading Optimization Results

Date: 2026-10-05. Scope approved by the user's option C. No deployment is included.

## Implemented Changes

- Load workflow pages on navigation, with a local loading status inside the shared layout.
- Defer the assistant until requested, enabled or bootstrapped from the URL. Keep its session mounted after closing.
- Defer the workflow configuration modal until first opened, retaining its state after closing.
- Import homepage/settings components directly instead of their legacy public barrel. Homepage appearance and behavior are preserved.
- Show project hydration/preparation status. Validate the board/project index and tolerate index write failures without deleting project documents.
- Remove the unused internal WorkflowModeHost, its private styles and test. Production callers use NewCanvasHost. Public Excalidraw exports and Opentu_old remain available.

## Browser Measurement Conditions

`node scripts/measure-canvas-loading.mjs baseline` and the same probe against the final production build. Fresh Chromium contexts at 1440x900 and 390x844; local HTTP with no compression, no cache and service workers blocked. Only publisher session discovery is mocked. External requests are blocked and no paid generation is submitted. Readiness means the canvas DOM is visible and two animation frames have completed. Home-to-canvas time includes the click.

Raw resource traces and screenshots live under ignored `tmp/canvas-performance/`. Final results use `verified-final/report.json`. These measurements cannot establish real WAN performance or upstream API behavior.

| Metric | Baseline | Final |
| --- | --- | --- |
| Cold loaded JS/CSS, either viewport | 16,853,441 bytes | 14,652,921 bytes (-13.1%) |
| Cold JS/CSS requests | 26 | 62 |
| Desktop home ready | 670 ms | 721 ms |
| Desktop home-to-canvas | 1,158 ms | 1,091 ms |
| Desktop total cold ready | 1,828 ms | 1,812 ms |
| Desktop cold long tasks | 788 ms | 603 ms |
| Desktop reload ready | 1,028 ms | 1,490 ms |
| Mobile home ready | 622 ms | 689 ms |
| Mobile home-to-canvas | 1,126 ms | 1,109 ms |
| Mobile total cold ready | 1,748 ms | 1,798 ms |
| Mobile cold long tasks | 711 ms | 540 ms |
| Mobile reload ready | 996 ms | 1,414 ms |

The demonstrated improvement is fewer bytes and less cold long-task work. Cold total readiness is approximately unchanged in these single runs; reload readiness regressed. Earlier final-build runs were slower still, illustrating local timing variance. The additional small chunks/requests are a tradeoff and may hurt high-latency connections. Do not describe this as a proven speedup, publish on that assumption, or infer guaranteed WAN performance. Production network/cache measurements and chunk consolidation remain necessary before claiming the user's loading complaint is resolved.

## Storage Measurement

`node scripts/measure-canvas-snapshots.mjs` uses synthetic compatible JSON projects and media storage keys. It measures Node.js CPU only, excluding browser rendering and database I/O.

| Projects | Nodes Per Project | JSON Bytes | Stringify Median / P95 | Parse Median / P95 |
| --- | --- | --- | --- | --- |
| 1 | 100 | 102,157 | 0.57 / 0.90 ms | 0.53 / 0.78 ms |
| 10 | 100 | 1,021,057 | 6.31 / 7.69 ms | 6.87 / 8.31 ms |
| 20 | 500 | 10,239,077 | 44.37 / 77.87 ms | 42.16 / 78.70 ms |

Keep the current storage format, 400 ms debounce and durable pre-submission flush. Ordinary snapshots are inexpensive in this benchmark. Per-project persistence could help large collections, but needs browser/database profiling and migration/recovery verification in a separate change.

## Rejected Experiments

- Explicit manual-chunk membership introduced static chunk cycles and production startup failure; removed.
- A shared React/scheduler/nanoid chunk passed cycle checks but saved only about 5 KB and added another request; removed.

## Remaining Opportunities

- Existing manual chunk groups absorb shared application dependencies; diagram and editor chunks still load during startup. A broader dependency-boundary redesign needs its own reviewed scope.
- Avoid serializing all projects for large collections after confirming browser I/O cost.
- Measure compressed transfer, cache behavior and first-time trial access against the deployed server. This iteration does not change the gateway or production cache policy.

## Validation

Focused navigation, persistence, settings/provider compatibility and durable task recovery tests passed. Latest changed-component checks passed (19 tests); the earlier broader set contributes 86 other unique tests, for 105 workflow tests total. Three existing startup-retry tests also passed. TypeScript application checking and production build passed. Production startup validation found no static chunk cycles. Browser interaction checks cover batch navigation, task list, both configuration surfaces, assistant opening and legacy canvas switching without paid requests. Final screenshots at both viewport sizes were inspected. These checks verify frontend compatibility with the public session fixture, not live administrator credentials or actual generation.

Existing Sass deprecation, Browserslist and mock IndexedDB warnings remain; no dependency upgrades were made.
