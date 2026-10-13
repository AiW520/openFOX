## 1. Gateway capacity
- [x] 1.1 Add backwards-compatible query concurrency configuration and separate request-class accounting.
- [x] 1.2 Add a bounded FIFO generation queue with timeout, cancellation, retry headers, and accurate admin counters.
- [x] 1.3 Reduce redundant buffering in bounded JSON responses while retaining secret redaction and task ownership extraction.

## 2. Admin and verification
- [x] 2.1 Update publisher limit controls and usage display for query concurrency and queue counts.
- [x] 2.2 Add tests for queue behavior, compatibility defaults, response security, and cleanup on every exit path.
- [x] 2.3 Run publisher gateway tests, JavaScript syntax checks and browser checks against existing admin assets. No React/TypeScript bundle sources changed, so a frontend rebuild is not needed for this change.

## Verification
- 23 publisher gateway/settings tests passed using Node 22.18 with sequential test files.
- Playwright checked administrator login, configuration save, page errors and text/viewport overflow at 1440x960, 900x900 and 390x844.
- Synthetic 32 MiB response memory comparison and screenshots are under `tmp/publisher-capacity-*`.
- OpenSpec strict validation passed. Changes are local; the remote server has not been redeployed.
