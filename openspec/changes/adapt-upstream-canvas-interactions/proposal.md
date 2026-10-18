# Change: Adapt upstream canvas reliability and interactions

## Why
The two embedded canvases need selected upstream fixes adapted to OpenTu's shared models, saved viewport, durable generation tasks, media storage and image enhancement. The user approved the first integration batch in `docs/upstream-canvas-feature-review.md`.

## What Changes
- Normalize generic reference-image MIME types before Gemini submission.
- Add full-text and selected-text copying to free-canvas cards and improve reading styles.
- Keep infinite-canvas menus and node panels readable across zoom levels, correct viewport observation and focus, and add manual focus with opt-in automatic focus.
- Keep reference selection controls visible and creation menus compact and localized.
- Preserve incoming references when copying nodes while isolating active generation and enhancement state.
- Show storage statistics when browser quota estimation is unavailable.
- Recover completed image results through download/insertion without resubmitting generation, delivered and tested separately.

## Impact
- Affected specs: canvas-upstream-interactions (new delta).
- Affected code: Gemini input conversion, card rendering/clipboard, infinite-canvas geometry/menus/copy/configuration/storage, and free-canvas image postprocessing.
- No new model, provider, timeout, retry, size or concurrency limits; no bulk upstream merge or data migration.
- Approval: the user confirmed this batch with “可以” after reviewing the feature assessment.
