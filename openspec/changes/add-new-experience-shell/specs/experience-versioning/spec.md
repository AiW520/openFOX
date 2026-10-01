## ADDED Requirements

### Requirement: The Application SHALL Offer Legacy And New Experiences

The application SHALL provide an explicit switch between the existing implementation named “旧版本” and the new creation experience named “新版本”.

#### Scenario: First visit during rollout

- **GIVEN** the user has no valid saved experience preference
- **WHEN** application initialization completes
- **THEN** the application SHALL show 旧版本
- **AND** SHALL NOT bypass Tuzi credential consumption or Provider synchronization

#### Scenario: Persist an explicit experience choice

- **WHEN** the user switches to 新版本 or 旧版本
- **THEN** the application SHALL persist that explicit choice locally
- **AND** a later visit SHALL restore it after normal application initialization

#### Scenario: Recover from an invalid preference

- **GIVEN** the saved experience preference is missing or unsupported
- **WHEN** the application reads the preference
- **THEN** it SHALL fall back to 旧版本

### Requirement: Experience Switching SHALL Preserve The Shared Workspace

Both experiences SHALL use the same workspace, board, tasks, assets and canvas persistence.

#### Scenario: Switch away from a modified canvas

- **GIVEN** the current board contains user changes
- **WHEN** the user switches between 旧版本 and 新版本 or returns to the new home
- **THEN** the current board identity and latest in-memory board data SHALL remain available
- **AND** returning to the canvas SHALL NOT create a duplicate board or replace it with an empty board

#### Scenario: Use standalone mode

- **GIVEN** OpenTu is opened without Tuzi handoff credentials
- **WHEN** the user uses either experience
- **THEN** existing standalone Provider and workspace behavior SHALL remain available

