## Context

OpenTu already has a complete provider and task pipeline. The new experience needs a more mature whiteboard surface without forking model routing or changing the legacy Plait workspace.

## Decisions

- Use `@excalidraw/excalidraw` because it is MIT licensed and provides a complete React whiteboard UI.
- Keep task submission in `useTaskActions` and model selection in the existing generation controls.
- Persist Excalidraw `elements`, `appState`, and `files` in a board-scoped localStorage namespace.
- Store task IDs in element custom data so completed tasks are inserted once after remount.
- Treat existing tldraw storage as legacy orphaned data and leave it untouched during this migration.

## Risks / Trade-offs

- Existing tldraw scene data will not be displayed by the new canvas. The old experience remains available for those scenes during the migration period.
- Excalidraw binary files can make localStorage large. Images produced by tasks should remain URL-backed elements where possible.

## Migration Plan

1. Ship Excalidraw behind the existing new experience switch.
2. Keep the legacy Drawnix route unchanged.
3. Validate board switching, task insertion, and mobile gestures.
4. Remove tldraw only after the new canvas has no remaining imports.
