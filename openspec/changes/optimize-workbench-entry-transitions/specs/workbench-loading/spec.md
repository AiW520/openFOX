## ADDED Requirements

### Requirement: Continuous workbench entry feedback

The system SHALL provide a visible destination or loading state while the selected home or canvas entry module and document data are loading, without presenting an empty outer Suspense fallback as the only response.

#### Scenario: Direct canvas entry

- **WHEN** an authenticated user opens a canvas URL whose entry module is not yet loaded
- **THEN** the boot or destination loading state remains visible until the destination can provide its own visible content or loading status
- **AND** existing document readiness and crash recovery protections remain active

#### Scenario: Data restoration continues after the entry loads

- **WHEN** the destination module is available but its document is still restoring
- **THEN** its loading shell identifies the pending destination and restoration state
- **AND** it does not report the canvas as fully interactive before restoration permits editing

### Requirement: Latest requested canvas transition

The system SHALL retain visible active content during asynchronous destination-module loading and SHALL commit only the latest requested valid navigation target.

#### Scenario: A second target supersedes a pending switch

- **WHEN** the user requests another destination before the previous destination module finishes loading
- **THEN** completion of the previous request does not replace the latest destination or its URL

#### Scenario: Destination module fails to load

- **WHEN** a requested destination module fails and existing asset recovery does not recover it
- **THEN** the user receives failure feedback and a usable recovery action
- **AND** the current document and navigation remain recoverable

### Requirement: Bounded editor preloading

The system SHALL reuse cached editor-module loaders for lazy entries and pointer or keyboard intent preloading, and SHALL keep speculative preloading within existing startup resource boundaries.

#### Scenario: The user focuses or points at a canvas destination

- **WHEN** a canvas destination receives keyboard focus or pointer intent
- **THEN** its static entry module may begin loading through the shared loader
- **AND** repeated intent and subsequent rendering reuse the same pending or fulfilled module load
- **AND** no inactive editor is mounted and no generation request is submitted for preloading

#### Scenario: Idle preloading on a constrained connection

- **WHEN** save-data is enabled or the connection is classified as slow
- **THEN** speculative idle preloading is skipped
- **AND** explicit user navigation remains available
