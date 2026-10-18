## Context

The current side panel already has a list, image preview modal, `useMediaIntersection`, and lease-backed `useStoredImage`. The change should extend those paths rather than introduce another media cache.

## Decisions

- Store only the small `list`/`grid` preference in localStorage.
- Keep the existing tree rows and filtering logic. Grid view changes presentation, not ordering or group membership.
- Use `useStoredImage` only for visible image thumbnails. Text, config, audio, video, groups, and empty images retain lightweight icons or labels.
- Use the existing node preview callback and modal for full-size image viewing; thumbnail view does not eagerly load full originals.
- Use icon-only view buttons with accessible labels and tooltips so the panel remains compact.

## Risks / Trade-offs

- A grid view can reduce text context, so each card keeps a title and type/status indicator.
- Images with no stored content remain a neutral placeholder and do not trigger a read.
- The first thumbnail render may be asynchronous; the card keeps a stable aspect ratio to avoid panel layout shifts.

## Validation

Run focused side-panel tests for preference persistence, list/grid rendering, filters, selection, and lazy thumbnail behavior. Validate the OpenSpec delta and manually inspect desktop and compact layouts in an isolated browser context.
