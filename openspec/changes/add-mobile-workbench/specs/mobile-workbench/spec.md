## ADDED Requirements

### Requirement: Compact mobile presentation
The application SHALL select mobile presentation through responsive media queries while sharing application state and preserving explicit version choices.

#### Scenario: Open from a phone
- **WHEN** a compact visitor opens without an explicit or saved experience choice
- **THEN** the new experience and compact creation presentation are selected
- **AND** rotating the device changes the layout without replacing persisted data

### Requirement: Shared creation handoff
The mobile home SHALL reuse shared model controls and carry prompt, model provenance, parameters and count into the existing infinite canvas without submitting generation automatically.

#### Scenario: Start a mobile creation
- **WHEN** a user selects a model and dimensions and enters a prompt
- **THEN** opening the canvas creates the corresponding draft node using those values
- **AND** the user can edit before submitting

### Requirement: Touch canvas controls
The mobile canvas SHALL expose navigation, node creation, upload, undo, zoom and editable generation controls with touch-sized targets and dismissible overlays.

#### Scenario: Navigate the canvas by touch
- **WHEN** a user drags the background or pinches it with two fingers
- **THEN** the existing viewport pans or zooms around the gesture anchor
- **AND** forms and node interactions are not consumed by background gestures

#### Scenario: Edit a mobile node
- **WHEN** a draft or selected node editor opens
- **THEN** its prompt and model controls appear within the visible mobile viewport
- **AND** edits use the existing metadata and generation handlers

### Requirement: Mobile shared services compatibility
Mobile configuration, tasks, batch generation and trial access SHALL reuse the existing providers, permissions, persistence and task recovery services.

#### Scenario: Use existing configuration
- **WHEN** a user opens the same browser workspace on a compact screen
- **THEN** the same configured models and tasks are available without copying credentials or migrating documents
