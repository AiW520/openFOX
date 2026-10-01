## ADDED Requirements

### Requirement: Compact top-level actions
Only the new-version canvas SHALL expose configuration, batch images, tasks and site sharing in a compact top menu. The bottom AI composer SHALL retain its existing placement, controls and state.

#### Scenario: Legacy version remains unchanged
- **WHEN** the old version is selected, or Drawnix is used without an explicit layout option
- **THEN** the C top menu SHALL NOT be mounted
- **AND** the original sidebar task action, sidebar geometry and bottom composer SHALL remain available.

#### Scenario: Switching between versions
- **WHEN** the user switches between the new canvas, new home and old version
- **THEN** the same Drawnix canvas and composer SHALL retain their current state
- **AND** the existing workspace and board persistence SHALL remain intact.

#### Scenario: Open task queue
- **WHEN** the user clicks the top task button
- **THEN** the existing task panel SHALL open through its existing deferred lifecycle
- **AND** active counts and unread failure indicators SHALL remain available without a duplicate sidebar button.

#### Scenario: Direct batch entry
- **WHEN** a desktop user clicks batch images, including while the image window is already open in single mode
- **THEN** the existing image window SHALL display the batch tab
- **AND** the user SHALL be able to switch back to single mode.

#### Scenario: Narrow screen
- **WHEN** the viewport does not support the legacy batch tab
- **THEN** the batch entry SHALL be omitted consistently with that existing restriction
- **AND** configuration, tasks, sharing and the bottom composer SHALL remain accessible.

### Requirement: Promote the public site
The share entry SHALL introduce OpenTu and 兔子 API and SHALL use https://api.tu-zi.com/console/chat/2 as the fixed workbench link and https://api.tu-zi.com as the platform link.

#### Scenario: Embedded or local canvas
- **WHEN** sharing from an iframe or a local canvas with board and conversation parameters
- **THEN** copied links SHALL use the fixed public entry and SHALL NOT include local URLs, board IDs, account credentials or conversation data.

#### Scenario: Clipboard denied
- **WHEN** the browser denies clipboard access
- **THEN** the share UI SHALL select the requested text for manual copying and SHALL NOT report a successful copy.
