# Unified Canvas Workbench Validation

## Scope

- Synced `origin/develop` at `3d84bb7c3b24fe6215a2daa945b80227fbd72456` (1.1.28), preserving local publisher and mobile integration.
- One workbench home with Free Canvas and Workflow Canvas selection; both editors keep independent document formats.
- Canvas switching restores the workflow project without returning to home. Direct workflow links override a saved Free Canvas preference.
- Home hands prompt, model reference, parameters, size and quantity to the selected editor without submitting generation.
- Shared publisher providers and personal provider settings remain available in both canvases.

## Automated Checks

### Workbench Entry And Transition Loading

- The user approved option A: shared cached module loaders, selected-entry startup loading, pointer/keyboard intent preload, selected-editor idle preload on home, and continuous destination feedback. Only one editor is mounted. Home idle loading skips hidden documents, save-data and 2g connections and cancels scheduled work when selection changes.
- A switch retains the current screen and URL until destination imports succeed. Only the latest request commits; selecting the active canvas, cancellation, home selection and history navigation invalidate older requests. Direct entry, WorkflowApp setup and document restoration each provide a visible loading state. Reduced-motion preferences disable the loading animation.
- Simulated host-module failure retained the free canvas and board URL. Chromium cached the failed module import, so the recovery action deliberately uses the existing task-guarded safe refresh. Unblocking the module and using that action restored the same board and permitted infinite-canvas entry. The test used a fresh isolated browser context without touching the user's open tabs or storage.
- The small static task panel was inspected and left unchanged because no independent startup bottleneck was demonstrated. Existing openProject array lookups, provider authentication, persistence formats, media policy and task execution/recovery behavior were preserved.

Five desktop runs before and five after, on the same local Vite server with isolated fresh empty documents, at 1440x960:

| Metric | Before Median | After Median |
| --- | ---: | ---: |
| Free canvas visible after own-provider gate | 1916 ms | 1682 ms |
| First free-to-infinite click to visible surface | 1761 ms | 1385 ms |
| First transition without canvas or loading status | 814 ms | 0 ms sampled |
| Repeat infinite-canvas entry | 270 ms | 189 ms |

- Final first-entry samples: 1703, 1359, 1385, 1477 and 1353 ms. The first-entry median improved about 21% in this environment. requestAnimationFrame observations did not find uncovered intervals in any final run. An intermediate implementation still had a 195 ms median gap before the last restoration-shell feedback fix; that result is superseded by the final samples. Raw before/after samples and initial colder-server assessment data are distinguished in `openspec/changes/optimize-workbench-entry-transitions/design.md`.
- These numbers measure visible canvas surfaces, not complete interaction readiness. They are development-mode results on empty documents, without CPU/network throttling. Development-server warmth, scheduling and module transforms affect the figures; repeated-entry and cold-start improvements are not a general production claim. No production build, deployment or paid generation was performed for this change.
- Focused Vitest rerun: 63 checks passed across cached loading (8), home handoff (14), entry transitions (6), navigation/version (9), workflow router (5), native storage (1) and task recovery (20). An earlier run also passed the four home draft checks; that JSDOM suite emits existing IndexedDB-unavailable warnings. Commands:

```powershell
node node_modules/vitest/vitest.mjs run apps/web/src/app/use-entry-transition.test.tsx apps/web/src/app/experience-navigation.test.ts apps/web/src/app/experience-version.test.ts --environment jsdom
# Run from packages/drawnix:
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/utils/cached-loader.test.ts src/components/new-experience/NewExperienceHome.test.tsx
# Run from repository root:
node node_modules/vitest/vitest.mjs run --config packages/drawnix/src/workflow-mode/web/vitest.config.ts tests/native-router.test.tsx tests/native-storage.test.ts tests/native-task-recovery.test.ts tests/home-canvas-draft.test.ts
```

- Independent Chromium checked desktop 1440x960 and mobile viewport 390x844: keyboard intent, pending cancellation, repeated switching with stable board/project IDs, home/back/forward, direct project reload, configuration, task panel and batch-generation entry. No uncaught page errors or horizontal overflow occurred. Direct batch-generation entry did not request the canvas project module before canvas navigation; home idle preload warmed only its selected entry in the observed default flow.
- Initial, pending, failed and ready screenshots were inspected. Artifacts in the local temporary directory use the prefix `opentu-entry-` with `loading`, `pending`, `failure` or `ready` and the viewport width. A previous browser script used an incorrect dialog locator for the WinBox settings window; the corrected `settings-dialog` test passed. This was a test-selector failure, not an application failure.
- Both workflow TODO files were reviewed; their existing Agent, resource-efficiency and inference rollout items are unrelated and remain unchanged. Both pending-test files now record this change. Real mobile devices, populated/large projects with existing media and unsaved edits, constrained-network performance, production assets, offline use and old-tab upgrade recovery remain manual acceptance items. Followed the workflow subtree instruction to leave builds and syntax checks to the user.

### Automatic Home Release Highlights

- The user selected option A: the first featured card uses the running version's existing release notes. The other four cards and the mobile home layout are preserved.
- Vite configuration synchronizes `CHANGELOG.md` to `changelog.json` before reading it and injects only the current version's grouped notes into the home card. No runtime release request, AI call or additional production dependency is needed.
- Missing, empty, withdrawn or non-release version notes fall back to the generic guide. Embedded `Unreleased` sections no longer leak into a preceding release; released Chinese category tags are recognized. Notes render as text.
- Validation: 16 focused Vitest checks and 4 Node parser regressions passed. Independent Chromium verified the v1.1.28 card, four detail entries, next/previous navigation, loaded cover images, 1440x960, 1366x768, 768x900, 390x844 and 320x740 layouts, with no page errors, horizontal overflow or runtime version/changelog requests. Desktop card/detail and mobile screenshots were inspected.
- The existing pending Agent tasks are unrelated and require no changes. Pending acceptance: real devices, the next actual release/build and production deployment. No production build or deployment was performed for this change.

### Earlier Workbench Checks

- Publisher gateway: 29 tests passed.
- Navigation and saved preference: 9 tests passed.
- Workflow publisher compatibility, shared settings and home draft: 13 tests passed.
- Workflow native model parameters: 95 tests passed.
- Home, featured content and native generation: 102 tests passed.
- Home and input UI events: 20 tests passed after final home settings changes.
- TypeScript application check passed.
- Production publisher build and startup budget checks passed; no static chunk cycles. Largest startup JavaScript asset: 348,236 bytes, below the 512,000-byte budget.
- Startup loading recovery: 3 tests passed. Startup validator regressions: 3 tests passed, covering nested bootstrap loading, sibling imports and lazy feature exclusion.
- Workflow runtime validation: 4 routes, 1,511 scoped CSS rules, 0 local plugins.
- OpenSpec proposal validation passed.

## Browser Checks

Production bundle verified at 360x800, 390x844, 844x390 and 1440x900:

- Fresh trial login, home selection and prompt handoff.
- Mobile node drawer, reachable generation controls, touch drag and pinch.
- Model settings, resources, task panel and batch generation panel.
- Repeated Free Canvas / Workflow Canvas switches, reload and exact project restoration.
- Home to Free Canvas prompt and quantity handoff.
- No uncaught page errors or horizontal page overflow.

Local screenshots and report: `tmp/mobile-workbench/`.

## Published Release

- Site: https://op.47.107.92.13.nip.io
- Administrator: https://op.47.107.92.13.nip.io/publisher
- Server release: `/opt/opentu-publisher/releases/20261013075453`.
- Previous release: `/opt/opentu-publisher/releases/20261008100827`.
- Existing provider data and server credentials preserved; secure pre-deployment backup retained on the server.
- Post-deployment health, fresh real trial login and both canvas workflows passed. Shared catalog contains 616 models; public session response contains no API key or secret fields.
- Post-deployment browser report: `tmp/mobile-workbench-online/report.json`; no uncaught page errors or failed assets.

No paid image/video/audio generation was submitted during this release validation. Provider routing and generation payload compatibility were covered by automated tests.
