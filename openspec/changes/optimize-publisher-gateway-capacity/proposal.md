# Change: Optimize publisher gateway capacity

## Why
The publisher gateway runs on a small server and currently applies one concurrency limit to generation and result polling. JSON responses are also collected through multiple full-size intermediate representations, which can raise peak memory when image responses contain base64 data.

## What Changes
- Reduce redundant buffering for bounded JSON upstream responses while preserving response sanitization, task ownership tracking, and existing API response semantics.
- Separate generation concurrency from result-query concurrency, retaining the existing `concurrency` setting as the generation limit for stored configurations.
- Add a small bounded FIFO wait queue for generation requests; reject excess or expired requests with a retryable response and expose queue/active counts in administrator usage.
- Keep image bytes in the browser and do not persist generated media on the gateway.

## Impact
- Affected specs: publisher-model-gateway.
- Affected code: `services/publisher-gateway/server.mjs`, its admin UI and tests.
- Existing persisted configuration remains readable; new query concurrency uses a documented default when absent.
- This change improves memory peaks and short bursts, but does not reduce image transfer bandwidth or raise the upstream provider's own limits.

## Approval
- The user selected option A in this conversation: optimize the existing gateway with reduced response buffering, a finite generation queue, and separate query concurrency. Implementation follows that authorized option; remote deployment is not included in this local update.
