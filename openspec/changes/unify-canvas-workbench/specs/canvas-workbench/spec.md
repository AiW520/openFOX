## ADDED Requirements

### Requirement: Unified canvas selection
OpenTu SHALL present one workbench with Free Canvas and Workflow Canvas choices and remember the user's selection without version labels.

#### Scenario: New visitor opens the workbench
- **WHEN** a visitor opens the root URL without an explicit canvas deep link
- **THEN** the unified creation home presents both canvas choices
- **AND** an editor loads only after selection and opening

### Requirement: Draft handoff
The workbench SHALL carry the prompt, provider model reference, generation type, selected parameters and quantity into the chosen canvas without submitting generation automatically.

#### Scenario: Visitor opens a canvas with a draft
- **WHEN** a visitor enters a draft and opens either canvas
- **THEN** that canvas receives the draft and selected parameters for further editing

### Requirement: Persistent compatible navigation
Canvas navigation SHALL preserve both document formats, restore the workflow project on repeated switches, accept existing experience and workflow URLs, and support browser history.

#### Scenario: Visitor switches and reloads
- **WHEN** a visitor switches between canvases and reloads
- **THEN** the chosen canvas and its document are restored
- **AND** the home is shown only when the visitor requests the workbench or opens its root entry

### Requirement: Shared configuration and authorization
Both canvases SHALL reuse the provider settings, trial authorization and publisher gateway, retaining mobile access and keeping publisher API keys on the server.

#### Scenario: Authorized tester chooses a canvas
- **WHEN** an authorized tester uses either canvas
- **THEN** publisher models are available through the authenticated gateway without exposing the provider key
