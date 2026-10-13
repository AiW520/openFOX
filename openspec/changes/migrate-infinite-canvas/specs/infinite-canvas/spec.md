## ADDED Requirements

### Requirement: New experience uses the migrated infinite canvas
When a user opens the new canvas, the application MUST show the project-based infinite canvas while preserving the existing new homepage and legacy canvas.

#### Scenario: Open a new canvas from the homepage
- **WHEN** the user selects the homepage action to open the canvas
- **THEN** the application creates a workflow project if needed and opens that project in the infinite canvas

### Requirement: Shared provider settings
The infinite canvas and legacy canvas MUST use the same provider profiles, credentials, catalogs, and global model defaults.

#### Scenario: Update a provider from either canvas
- **WHEN** a user adds, edits, removes, or selects a provider/model in either canvas
- **THEN** the shared settings manager persists the change and both canvases use the updated configuration

### Requirement: Preserve document-local generation parameters
The infinite canvas MUST keep node-specific prompt and generation parameters in its workflow project without overwriting global defaults.

#### Scenario: Edit a node's image dimensions
- **WHEN** a user changes dimensions on one generation node
- **THEN** the node uses the new dimensions and the global model defaults remain unchanged

### Requirement: Preserve top-level canvas actions
The new canvas MUST keep controls for version switching, provider settings, batch generation, and tasks, and each control MUST operate on the active workflow project.

#### Scenario: Open batch generation or tasks
- **WHEN** the user opens batch generation or tasks from the canvas header
- **THEN** the corresponding workflow interface opens with the active project context

### Requirement: Safe task recovery
Workflow task recovery MUST reuse the current durable task infrastructure and MUST NOT repeat a provider submission whose outcome is uncertain.

#### Scenario: Restore an uncertain submitted task
- **WHEN** the application reloads after a workflow task was submitted but its result is unknown
- **THEN** it may query the original task but MUST NOT submit a replacement request automatically
