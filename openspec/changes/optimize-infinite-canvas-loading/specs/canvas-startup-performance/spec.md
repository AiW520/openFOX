## ADDED Requirements

### Requirement: Route-scoped workflow loading
The application SHALL load workflow page implementations when their route is selected and show a local loading state while retaining the shared layout and host controls.

#### Scenario: Open a project
- **WHEN** the user opens an infinite canvas project
- **THEN** unrelated workflow page entry modules are not statically imported by the router
- **AND** browser history, route parameters and shared provider settings remain available

#### Scenario: Navigate to batch generation
- **WHEN** the user selects batch generation
- **THEN** its implementation loads and a visible loading status is shown until the page is ready

### Requirement: Recoverable project startup
The canvas host SHALL show status while restoring projects and tolerate malformed board/project index data without deleting persisted project documents.

#### Scenario: Restore with a malformed index
- **WHEN** the stored board/project index is invalid
- **THEN** the host uses an empty index for navigation and leaves project documents intact

### Requirement: Evidence-based compatible optimization
Performance changes SHALL include comparable before/after measurements and preserve existing project storage formats, shared provider configuration and durable task submission behavior.

#### Scenario: Measure the optimized build
- **WHEN** the production browser probe runs before and after optimization
- **THEN** it records readiness and resource measurements under the same conditions and identifies mocked dependencies

#### Scenario: Restore an existing project
- **WHEN** a previously persisted project is opened after the change
- **THEN** its nodes, viewport and generation parameters remain readable without migration
