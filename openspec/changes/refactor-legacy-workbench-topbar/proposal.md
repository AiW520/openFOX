# Change: Implement approved layout C only on the new-version canvas

## Why
The user approved layout C on 2026-09-27 after reviewing three interactive mockups. Frequently used sidebar actions should be reachable from the top, while the existing bottom AI input and its mode, model, parameter, upload and count controls retain their current position and behavior.

## What Changes
- Add a compact top menu with configuration, batch image generation, tasks and site sharing.
- Move the existing task button to the top while retaining its counters, failure acknowledgement and panel lifecycle.
- Open the existing image generation window directly in batch mode on supported desktop viewports.
- Share the fixed public entry https://api.tu-zi.com/console/chat/2 with OpenTu and 兔子 API introduction, without canvas, conversation, account or iframe URLs.
- Keep existing sidebar tools, dialogs and the bottom AI input. Reuse existing theme tokens and avoid animated blur or canvas render subscriptions.

- The old version retains its original sidebar, task button, dialogs and composer. Layout C is explicitly opt-in from the new-version entry; default Drawnix consumers stay legacy.
- Reuse the existing new-version home and version preference. The new canvas uses Drawnix rather than the rejected Excalidraw surface; existing Plait board persistence stays intact.

## Approval
Explicit user approval: “C，按照C来做吧”. This document records that selected design; no additional product decision is required.

## Impact
- Affected specs: legacy-workbench-navigation
- Affected code: unified toolbar, bottom task action, TTD dialog mode selection, scoped topbar and site-sharing components.
