# Unified Canvas Workbench Validation

## Scope

- Synced `origin/develop` at `3d84bb7c3b24fe6215a2daa945b80227fbd72456` (1.1.28), preserving local publisher and mobile integration.
- One workbench home with Free Canvas and Workflow Canvas selection; both editors keep independent document formats.
- Canvas switching restores the workflow project without returning to home. Direct workflow links override a saved Free Canvas preference.
- Home hands prompt, model reference, parameters, size and quantity to the selected editor without submitting generation.
- Shared publisher providers and personal provider settings remain available in both canvases.

## Automated Checks

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
