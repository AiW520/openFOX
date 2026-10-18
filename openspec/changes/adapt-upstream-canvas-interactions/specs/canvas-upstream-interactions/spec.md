## ADDED Requirements

### Requirement: Reference Image MIME Compatibility
The system SHALL identify supported image signatures when Gemini reference data has missing or generic binary MIME, preserve the original data/order, and reject unknown binary or explicit non-image references before generation submission with the failing reference index.

#### Scenario: Generic binary reference
- **WHEN** a valid PNG reference is declared application/octet-stream
- **THEN** the submitted image part SHALL use image/png with unchanged image data

#### Scenario: Invalid reference
- **WHEN** the second reference contains HTML or unknown binary data
- **THEN** submission SHALL fail before calling the provider and identify the second reference

### Requirement: Copyable Readable Text Cards
The system SHALL support copying a card's full original text and copying selected body text independently of canvas shortcuts, with visible success/failure feedback and retained note links and stored dimensions.

#### Scenario: Text selection
- **WHEN** the user copies a selected passage in a card body
- **THEN** only the selected passage SHALL be copied and canvas copy SHALL not run

### Requirement: Stable Canvas Overlays And Focus
The system SHALL measure the mounted drawing surface without resetting a saved viewport, keep menus and desktop node panels readable across zoom, and focus nodes within visible space around surrounding UI. Automatic focus SHALL be opt-in and disabled by default.

#### Scenario: Restored viewport
- **WHEN** a project finishes restoration and its container mounts
- **THEN** size observation SHALL attach without overwriting its saved pan and zoom

#### Scenario: Mobile focus
- **WHEN** a user focuses a node on a compact screen
- **THEN** the node SHALL be framed above the mobile dock and editor drawer, without counter-scaling the drawer

### Requirement: Unobstructed Reference Selection
The system SHALL keep reference selection controls fixed in the visible drawing area, suppress interfering node tools while selecting references, and provide compact localized creation menus while preserving plugin titles.

#### Scenario: Panned reference selection
- **WHEN** the user pans or zooms while selecting references
- **THEN** the exit/selection control SHALL remain visible and node hover tools SHALL remain hidden

### Requirement: Independent Node Copies With Incoming References
The system SHALL preserve valid incoming references on duplicate and paste within a project, remap copied sources, exclude outgoing references, and isolate active generation/video/enhancement identities from the copied outputs.

#### Scenario: Copy a generated node
- **WHEN** a node is copied without copying its reference source
- **THEN** the copy SHALL retain a reference to the existing source and SHALL NOT attach to the original active generation or enhancement attempt

### Requirement: Optional Storage Quota Estimation
The system SHALL display independently computed local content usage when browser storage estimation is missing or rejected, representing unavailable quota as unknown.

#### Scenario: Storage API unavailable
- **WHEN** navigator.storage.estimate is unavailable
- **THEN** local content usage SHALL still be readable and quota SHALL NOT be shown as zero

### Requirement: Completed Image Result Recovery
The system SHALL distinguish recovery of a completed image result from regeneration. Retrying a failed download, decode or insertion SHALL preserve the task result and original invocation route and SHALL NOT submit generation again.

#### Scenario: Retry failed postprocessing
- **WHEN** an image task is completed but insertion failed and the user retries
- **THEN** the existing result SHALL be processed again without calling the generation retry API

#### Scenario: Already inserted result
- **WHEN** recovery is requested after that task's result was inserted
- **THEN** no duplicate canvas output SHALL be inserted
