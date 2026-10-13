# Replace the New Canvas with the Infinite Canvas

## Why

The current new-experience canvas is not the infinite workflow canvas users expect. The implementation in `Opentu_old` already provides the intended project-based infinite canvas, generation nodes, batch generation, and related workflow tools.

## What Changes

- Replace the active new-experience canvas with the migrated workflow canvas while keeping the existing homepage and legacy Drawnix canvas intact.
- Preserve the new-experience canvas header and connect its version switch, provider settings, batch generation, and tasks controls to the migrated canvas.
- Route the existing homepage canvas action into the migrated canvas and restore the selected workflow project.
- Use the existing settings manager and task infrastructure as the shared source of truth across both canvas versions.
- Keep workflow project documents separate from legacy Drawnix board documents; do not rewrite either format during migration.

## Approval

The user selected implementation option B and approved proceeding with this shared-settings/shared-task architecture.

## Risks

- The workflow canvas has a large dependency surface and global styles; lazy loading and scoped CSS are required to protect the homepage and legacy editor.
- Workflow task records must retain the existing durable submission and recovery protections; unsupported recovery must never cause a duplicate provider submission.
- Existing workflow documents may exist in local browser storage and must remain readable after the code is moved.
