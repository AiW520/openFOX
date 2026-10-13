# Mobile Workbench Validation

Validated on 2026-10-08 using the local publisher production build.

- Focused home, navigation, routing, settings and experience tests: 39 passed.
- Shared provider settings and native parameter/editor compatibility tests: 14 passed.
- Web and drawnix TypeScript checks passed.
- Publisher production build passed. Startup bundle budgets passed with no chunk cycles.
- Playwright passed at 360x800, 390x844, 844x390 (touch) and 1440x900 (desktop).
- Browser checks covered trial entry, prompt handoff, publisher model selection, reachable editor controls, touch node dragging, anchored pinch, resources, tasks, settings, batch return and legacy switching. No page errors were observed.

Reproduce browser checks with `node scripts/verify-mobile-workbench.mjs`.
Screenshots and the report are saved under `tmp/mobile-workbench/`.

Preview is available at `http://127.0.0.1:7207/`; it listens on all interfaces for same-network phone access.

## Online Release

Deployed to `https://op.47.107.92.13.nip.io` on 2026-10-08 with release directory `/opt/opentu-publisher/releases/20261008073041`.

- Rebuilt the publisher frontend with `VITE_BASE_URL=/` and the administrator provider editor before deployment.
- Production startup validation and all four browser viewports passed on the final build and again on the live site.
- `pnpm publisher:test`: 29 passed.
- `node scripts/verify-publisher-release.mjs`: real trial login, shared catalog (611 models), mobile prompt handoff/editor, HTTPS health and deep-link assets passed. No page errors or failed assets.
- Server service is active. Configuration and trial-code file hashes were unchanged after deployment.
- Previous release remains available; data backup is at `/var/backups/opentu-publisher/data-before-mobile-20261008`.
- Online screenshots/report are under `tmp/mobile-workbench-online/`.

Limits: Chromium device emulation was used; physical iOS/Android and virtual keyboards still need device verification. General navigation tests use fixture sessions; the release smoke test uses a real trial login. Generation requests were blocked, so these checks made no paid generation calls.
