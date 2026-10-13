# Change: Mobile workbench with shared application behavior

## Why

The current narrow canvas compresses desktop controls, clips node editors and lacks touch pinch navigation. Mobile visitors need a usable creation workflow with the same providers, tasks and persisted documents.

## Approval

On 2026-10-08 the user selected option B: a dedicated mobile presentation sharing existing business logic. The first release covers home, infinite canvas, configuration, tasks and batch generation. This authorizes implementation; deployment is not part of this request.

## What Changes

- Detect compact screens with live media queries, including phone landscape, without relying on user-agent strings.
- Provide a compact mobile creation home reusing model controls and canvas draft handoff.
- Provide touch-sized canvas navigation, a compact tool dock, overlay resource drawer and bottom node editor.
- Add background pinch zoom and pan using existing viewport transforms.
- Adapt configuration, tasks, batch pages and trial controls to safe areas and phone keyboards.
- Preserve explicit version switching, desktop presentation, shared settings, task recovery and storage formats.

## Impact

- Affected specs: mobile-workbench
- Affected code: application view selection, new-experience home, workflow canvas UI, touch navigation, scoped mobile styles and focused tests.
- No new generation service, provider store, API-key distribution, document schema or publisher authorization logic.
