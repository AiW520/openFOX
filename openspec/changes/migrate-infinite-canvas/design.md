# Design: Migrate the Infinite Canvas

## Runtime Boundary

Mount the migrated workflow application only when the new canvas is active. Keep the existing new homepage shell and the legacy Drawnix editor as separate routes/views. Keep workflow route state under a workflow URL prefix so browser navigation and the version switch do not collide with host routes. Scope workflow global CSS to its root.

## Shared Provider Configuration

Treat the current `settingsManager` provider profiles, catalogs, and invocation presets as the only source of provider credentials and selected defaults. Adapt the workflow editor's channel and model presentation to these settings. Workflow-only node parameters and document layout stay in the workflow document; changes to provider credentials or global model defaults are persisted through the settings manager and are observed by both editors.

## Shared Tasks

Use the current task queue and task storage for workflow tasks. Adapt workflow task presentation to its node IDs and project IDs. Retain durable one-shot submission claims and query-only recovery semantics; do not submit an uncertain task again after reload.

## Data Compatibility

Keep workflow project persistence and legacy board persistence separate. Opening a new workflow project creates a project only when no corresponding project exists, then restores it. Do not bulk-convert or delete either storage format.

## Visual Controls

Keep the current new-experience top bar as the host-owned shell. Provider settings open the host provider settings; batch generation and tasks open workflow-owned interfaces in the selected project context. Do not show a second workflow top navigation bar.
