# Change: Optimize infinite canvas loading

## Why

The migrated workflow router imports every page before the selected canvas can render. The canvas host also leaves hydration without visible status. Project persistence needs measurement before changing its storage architecture.

## Approval

The user selected option C on 2026-10-05: measure loading and storage, optimize demonstrated bottlenecks, and remove confirmed unused internal hosts. This authorizes implementation of this proposal.

## What Changes

- Record a reproducible production-build baseline and compare the same browser scenarios after changes.
- Load workflow pages on navigation with local loading feedback, preserving browser history and shared settings.
- Defer unopened assistant/configuration UI and use direct homepage/settings imports to reduce startup resources, keeping assistant bootstrap and modal state intact.
- Provide canvas hydration feedback and tolerate invalid board/project index data without deleting documents.
- Measure project snapshot costs; apply only demonstrated, format-compatible improvements in this iteration.
- Remove the unreferenced internal WorkflowModeHost, its styles, and its own tests.

## Impact

- Affected specs: canvas-startup-performance
- Affected code: workflow router, NewCanvasHost, canvas persistence, focused tests and performance tooling
- Preserve the homepage, legacy canvas, publisher credentials, task recovery, database names and document formats.
- Retain publicly exported Excalidraw components and the Opentu_old reference checkout.
