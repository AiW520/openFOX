# Change: Add canvas node list and thumbnail views

## Why

Large workflow canvases become difficult to scan when the side panel only shows a compact text list. The upstream canvas adds a list/thumbnail view and media preview affordances that can be adapted to the existing OpenTu side panel.

The user approved batch 2A (list, thumbnails and preview) and explicitly requested implementation. This change records that approved scope.

## What Changes

- Add a persisted list/thumbnail view switch to the canvas element panel.
- Render image nodes with lazy, lease-backed thumbnails in thumbnail view while keeping non-image nodes lightweight.
- Keep node focus, filtering, group rows, selection export, and image preview behavior available in both views.
- Keep mobile panel controls touch-friendly and avoid loading original media for off-screen rows.

## Impact

- Affected specs: canvas-node-views.
- Affected code: workflow canvas side panel, workflow i18n, focused component tests.
- No generation protocol, canvas document schema, or media storage format changes.
