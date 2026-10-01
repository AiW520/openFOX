## Implementation
- [x] Add the compact C topbar and reuse existing configuration, task and batch windows.
- [x] Preserve the bottom AI composer and original side tools.
- [x] Add fixed site sharing with accurate copy success/failure feedback and iframe-safe links.
- [x] Verify typechecks, focused behavioral tests, desktop/mobile layout and real browser interactions.

- [x] Verify legacy/new isolation, version switching, new-home navigation and composer state in the real browser.

## Scope correction validation
- Follow-up: restored the stopped 7201 preview server, fixed the new-home brand link to retain its version, board and unsent draft without reloading, and persist explicit version-entry choices. Version storage handles a denied `window.localStorage` getter. Four version-preference tests, web TypeScript and browser navigation/draft/settings/sharing checks pass without page errors.
- Implementation belongs to `/Users/sdy09/Documents/ChatGPT/opentu-test` (port 7201). The accidental changes in `/Users/sdy09/Documents/ChatGPT/opentu 迭代` (port 7202) were reverted exactly; its Git status is clean.
- New canvas uses `Drawnix canvasLayout="workbench"`; the default is `legacy`. Existing new-version home and preference are connected again. Neither the discarded Excalidraw canvas nor its result sidebar is mounted.
- Browser verified new → legacy → new home → canvas, home settings, reload, original sidebar task placement, new top task toggle, batch tab, configuration and fixed public sharing. No page errors.
- Composer draft survives version/home switching, and its bottom margin remains 12 px in both versions. Canvas stays mounted when returning home to preserve state.
- New drawer placement begins below the top menu so the task toggle remains clickable; legacy drawer CSS is unchanged.
- At 1100, 1024, 768, 390 and 320 px, header and share button stay in bounds and sharing opens/closes. Existing mobile batch restriction is retained.
- Both TypeScript checks, two sharing tests, toolbar ESLint and strict OpenSpec validation pass. App-wide ESLint reports the existing web/drawnix dependency cycle and pre-existing inferred-type errors; these are outside the layout correction.

## Validation (before scope correction)
- Drawnix and web TypeScript checks passed.
- Two site-share tests cover fixed public URLs and clipboard denial with manual selection.
- Browser checks at 1440, 1100, 1024, 768, 390 and 320 px verify topbar/share bounds, existing settings window, task panel and repeated batch/single switching.
- Composer text and bottom anchoring survive opening settings and sharing; no AI-input or chat-drawer source changes.
- Scoped ESLint passed (Nx module-boundary rule skipped because the project graph cache was not available).
- No generation request was submitted and no production deployment was performed.
