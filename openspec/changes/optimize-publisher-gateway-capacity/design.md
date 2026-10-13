# Design: Optimize publisher gateway capacity

## Request classes and limits
- Generation POST requests consume the configured generation concurrency (`limits.concurrency`, preserving the existing setting and UI meaning).
- Owned task/result GET requests consume a separate `limits.queryConcurrency` setting with a conservative default and validation bounds. The lightweight `/models` catalog response does not consume an upstream slot.
- A FIFO queue holds at most 8 waiting generation requests. A queued request waits at most 30 seconds; queue-full and wait-expired responses use HTTP 429 and `Retry-After` so the browser can retry. Cancellation/disconnect removes a queued request promptly.
- Queue admission and slot release must be exception-safe. The queue is process-local and bounded; persistence or multi-instance coordination is out of scope.

## JSON response memory
- Retain a strict maximum response size and reject oversized upstream JSON before forwarding it.
- Reuse incoming byte chunks instead of cloning them. Avoid concatenation for a single chunk and avoid allocating an extra redacted string when no credential occurs. Keep JSON.parse for validation and extraction of task IDs needed by ownership checks.
- Concurrent proxy JSON responses share a 128 MiB input-byte budget, held until client delivery finishes. This budget is not an RSS limit: decoded strings, parsed data, and uploads also occupy memory.
- Binary image/video responses continue to use the existing stream pipeline. No generated media is written to disk.

## Compatibility and observability
- Existing `limits.concurrency` remains the generation ceiling for deployed configuration files and older admin clients.
- Missing `queryConcurrency` is filled by a default during normalization. Admin config reads return the normalized value.
- Administrator usage reports active generation, active query, and queued generation counts. Existing total active can remain as a derived compatibility field if needed.

## Validation
- Test distinct generation/query ceilings, FIFO progression, full-queue rejection, queue timeout/cancellation, and slot release after errors.
- Test old configurations without `queryConcurrency`, unchanged response/error contracts, secret redaction, task ownership tracking, and large response size rejection.
- Run publisher gateway tests and an application/service build if the admin UI contract changes.

## Risks
- A queue improves brief bursts but holds client connections and cannot increase sustained upstream capacity; queue size and wait time must remain small.
- JSON image payloads are inherently large. The implementation must preserve credential redaction and task tracking rather than forwarding uninspected data to save memory.
- Process-local counters reset on restart and do not coordinate across multiple gateway instances.

## Local verification
- A synthetic 32 MiB base64 response compared the previous chunk-cloning reader with the reader that reuses byte chunks. Sampled process RSS was approximately 151 MiB before and 143 MiB after on Node 22.18 on Windows. This is a local microbenchmark, not a server capacity or real-request latency measurement.
- Incremental decoded string concatenation was rejected because sampled RSS increased to approximately 166 MiB. Standard JSON parsing remains in use.
