## ADDED Requirements
### Requirement: Separate concurrency and bounded generation queue
The gateway SHALL require a visitor session for upstream requests, an administrator
session for configuration writes, same-origin mutations, selected model validation,
persistent per-IP and global daily quotas, separate bounded concurrency for
generation and owned task queries, and a bounded wait queue for generation requests.

#### Scenario: Generation burst fits the bounded queue
- **WHEN** all generation slots are occupied and the waiting queue has capacity
- **THEN** the authenticated generation request waits in FIFO order for at most the configured queue wait
- **AND** it starts when a generation slot becomes available

#### Scenario: Generation queue is full or expires
- **WHEN** a generation request arrives while all slots and queue positions are occupied, or its queue wait expires
- **THEN** the gateway returns a retryable HTTP 429 response with `Retry-After`
- **AND** it does not call the upstream provider for that rejected request

#### Scenario: Task polling uses its own bounded capacity
- **WHEN** an authenticated visitor polls an owned task while generation slots are occupied
- **THEN** the poll is governed by the separate task-query concurrency limit
- **AND** polling does not consume a generation slot

### Requirement: Bounded response handling
The gateway SHALL bound upstream JSON response size and minimize duplicate full-response buffers while preserving API Key redaction, task ownership tracking, and response semantics. Binary media responses SHALL continue to stream through the gateway without persistent server-side media storage.

#### Scenario: Large image response is forwarded safely
- **WHEN** an upstream image endpoint returns a valid JSON response within the configured size limit
- **THEN** the gateway forwards the response with the existing compatible JSON structure
- **AND** any embedded server credential is redacted
- **AND** returned task identifiers remain restricted to their submitting visitor

#### Scenario: Upstream JSON exceeds the configured bound
- **WHEN** an upstream JSON response exceeds the response size limit
- **THEN** the gateway terminates processing with a sanitized gateway error
- **AND** it does not retain or persist the media response
