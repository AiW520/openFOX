## Context

The workbench already lazy-loads its home, free canvas, infinite-canvas host and settings overlay. The infinite host subsequently loads WorkflowApp, which then loads its selected route. The outer entry fallbacks are null. Each canvas is conditionally mounted by App.

NewCanvasHost already shows hydration and inner-module loading statuses, but these cannot cover the time spent loading the host itself. Its openProject implementation is a synchronous array lookup, so two calls are not evidence of expensive duplicate project initialization and do not justify a persistence refactor.

The boot overlay is released when App exits its isLoading state, independently of the lazy screen's readiness. Existing startup prefetch uses the Service Worker; local development normally disables that worker. Development module-request counts cannot be treated as production bundle counts.

## Assessment Evidence

Headless Chromium, isolated fresh contexts, mocked publisher session returning 401, manually selecting the existing own-provider entry, no actual credentials or generation. Desktop viewport 1440x960; mobile viewport 390x844 on the same desktop machine, without device CPU/network emulation. Test documents are newly created isolated empty documents. The user's open browser tabs and storage were not used.

| Sample | Desktop | Mobile viewport |
| --- | ---: | ---: |
| Free canvas visible after own-provider gate | 3752 ms | 5573 ms |
| First free-to-infinite click to visible surface | 3252 ms | 2768 ms |
| First transition without either canvas surface | 3149 ms | 2657 ms |
| First transition without canvas or loading status | 1637 ms | 1033 ms |
| First return to free canvas | 756 ms | 518 ms |
| Repeat entry to infinite canvas | 615 ms | 302 ms |
| Repeat return to free canvas | 386 ms | 199 ms |

An earlier independent desktop sample measured 3415 ms for first infinite entry and 501-732 ms for repeat switches. Surface visibility is a limited proxy: it does not prove complete data restoration or interaction readiness. Timings include browser automation observation delay. An initial measurement capped the Resource Timing buffer and its request counts were discarded. A failed homepage selector sample and an unauthenticated reload timeout were also excluded from performance conclusions.

Corrected request event counters recorded 428 desktop and 337 mobile-viewport requests during first infinite entry, versus 2-4 on repeated transitions. Counts include all request types and development/background activity; they are not an attribution of all requests to a specific module. A separate homepage cold sample was 5749 ms including the own-provider gate, with 538 requests; it is not directly comparable to the free-canvas samples.

## Alternatives

| Dimension | A: bounded preload and continuous loading feedback | B: A plus retaining both editors |
| --- | --- | --- |
| Implementation complexity | Moderate; entry loading and navigation coordination | High; both editors' active/inactive lifecycles |
| Runtime performance | Can reduce first-entry module wait and empty gaps; editor remount costs remain | Can reduce repeated remount costs; increased resident memory and possible background CPU |
| Extensibility | Reuses existing lazy boundaries and route ownership | Each new editor/provider needs explicit suspension behavior |
| Maintenance | Localized loading and race-condition tests | Ongoing hidden-editor, listener and resource-lifecycle coverage |
| Pitfalls | Prefetch contention, stale navigation intent, chunk-load errors | Hidden keyboard handlers, duplicate work, plugins, resize state and media retention |

## Approved Decision: A

The user selected A. Preloading is limited to static editor code and necessary entry dependencies. No inactive editor is mounted and no generation is submitted for warming. Pointer intent and keyboard focus share the same cached imports. Home schedules only its selected editor during idle time, skips hidden documents and save-data/2g connections, and cancels scheduled work when selection changes. Selected direct entries load alongside workspace restoration. Non-canvas workflow deep links do not preload the canvas project page.

During an asynchronous switch, leave the active screen usable and show the pending destination. A failed or superseded load must not replace it or alter the URL to a failed target. Once the module is available, the destination may use its themed shell while data restores. Do not represent a shell as an interactive, fully restored canvas.

For direct entry, preserve authentication, crash recovery and existing data-readiness protections. Provide continuity between the boot overlay and actual destination feedback. Avoid artificial progress percentages and minimum animation delays. Respect reduced-motion preferences.

Only consider B after A is measured and remaining remount cost warrants it. No numerical speedup or memory saving is promised before implementation and comparable measurements.

## Implementation Evidence

The host and WorkflowApp/project route loaders share pending and fulfilled imports. Navigation waits for destination modules before committing the latest request; cancellation, home selection and history navigation invalidate older requests. The active screen stays visible while imports load. The outer shell, WorkflowApp root setup and canvas data recovery each provide a visible status. Loading indicators respect reduced motion. Failed navigation leaves the current screen and URL intact. An explicit refresh action uses the existing safeReload guard: Chromium negatively caches failed module imports, so repeating the same dynamic import alone did not recover in browser testing.

The static task panel was inspected and left in place: it is a small component with no demonstrated independent startup bottleneck. openProject remains its existing array lookup. No persistence schema, media resource policy, provider contract or task recovery contract changed.

Five comparable desktop runs used fresh empty documents on the same local development server. The earlier assessment samples above include colder server/module transforms and are not the comparison baseline. The final samples were taken after the recovery-shell feedback change and after focused tests finished to avoid concurrent test CPU contention.

| Metric (milliseconds) | Before samples | Final samples | Before median | Final median |
| --- | --- | --- | ---: | ---: |
| Free canvas after provider gate | 2067, 1848, 1943, 1907, 1916 | 2054, 1682, 1670, 1772, 1668 | 1916 | 1682 |
| First infinite-canvas entry | 1942, 1761, 1477, 1613, 2270 | 1703, 1359, 1385, 1477, 1353 | 1761 | 1385 |
| First transition without canvas or status | 892, 814, 477, 667, 1080 | 0, 0, 0, 0, 0 | 814 | 0 |
| Repeat infinite-canvas entry | 150, 371, 239, 353, 270 | 194, 189, 181, 226, 178 | 270 | 189 |

Frames were observed with requestAnimationFrame from the click until the target surface appeared. Zero uncovered time means no uncovered interval was sampled; it is not a guarantee about every possible render or network condition. First-entry median improved approximately 21% in these local samples. Repeated entry and cold startup remain sensitive to scheduling and development-server warmth; no general production speedup or full-interaction-readiness claim follows from these numbers. Real mobile devices, large existing projects, production assets, offline upgrades and network-constrained performance remain acceptance work.

## Validation

- Compare at least five same-environment samples before/after for each changed entry/transition; distinguish development results from a production build if separately authorized and available.
- Observe canvas readiness, loading feedback, main-thread blocking and resource requests separately.
- Exercise pointer and keyboard entry, rapid destination changes, home navigation, browser back/forward, failed module loads and slow document hydration.
- Verify board/project identity, viewport, unsaved changes, existing media display, provider/settings access and task recovery without submitting generation requests.
- Check desktop/mobile layout and reduced motion. Preserve current warm navigation and avoid redundant fetches from shared loaders.
- Run focused tests for changed contracts. Follow the workflow subtree's build instructions if implementation enters it.
