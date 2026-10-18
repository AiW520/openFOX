## ADDED Requirements

### Requirement: Shared enhancement processing
OpenTu SHALL expose image enhancement to both canvases through a shared authenticated service boundary without exposing inference credentials.

#### Scenario: User enhances an existing image
- **WHEN** an authorized user requests enhancement of an accessible image
- **THEN** the gateway submits image bytes to the configured enhancement service
- **AND** the browser receives a tracked task identity without the service token

### Requirement: Explicit output dimensions
Enhancement SHALL preserve source aspect ratio and expose actual pixel dimensions, honoring supported targets without exceeding configured scale and resource limits.

#### Scenario: Square 1K image is enhanced four times
- **WHEN** a 1024x1024 image is processed with a supported 4x setting
- **THEN** the stored output is 4096x4096
- **AND** the original remains available

### Requirement: Recoverable asynchronous lifecycle
Enhancement SHALL run asynchronously with persisted source, settings, job identity and output relationships, allowing progress tracking after navigation or refresh.

#### Scenario: User refreshes during enhancement
- **WHEN** a user reloads while an enhancement job is running
- **THEN** OpenTu resumes tracking that job without resubmitting generation

### Requirement: Source preservation on failure
An enhancement failure SHALL preserve the source image and SHALL NOT automatically submit a new source-generation request.

#### Scenario: Enhancement fails after generation succeeds
- **WHEN** the enhancement service fails or the user cancels enhancement
- **THEN** the completed source image remains viewable and downloadable
- **AND** any retry applies only to enhancement

### Requirement: Durable result display
OpenTu SHALL persist completed enhanced images before the remote service expires them and use size-appropriate previews for canvas rendering.

#### Scenario: Enhanced result becomes ready
- **WHEN** the enhanced image is validated and saved
- **THEN** the selected display policy can show the enhanced rendition with its actual dimensions
- **AND** its full-resolution download remains available independently of remote temporary storage
