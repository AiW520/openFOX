## ADDED Requirements

### Requirement: Canvas node list and thumbnail views

The canvas element panel SHALL provide a persisted list/thumbnail view switch. Both views SHALL preserve the current search, type filter, group hierarchy, node focus, multi-selection, and export actions.

#### Scenario: Switch view

- **WHEN** the user selects thumbnail view and later reopens the canvas panel
- **THEN** thumbnail view SHALL remain selected without changing canvas nodes or viewport

#### Scenario: Preserve filtering and selection

- **WHEN** the user searches, filters, or enters selection mode in either view
- **THEN** only matching rows/cards SHALL be shown and the same nodes SHALL be available for focus or export

### Requirement: On-demand canvas thumbnails

Thumbnail view SHALL use the existing intersection-aware, lease-backed media loading path for stored images. Off-screen or empty image nodes SHALL NOT eagerly read original media, and each thumbnail SHALL keep stable dimensions while loading.

#### Scenario: Off-screen images

- **WHEN** an image card is outside the visible side-panel area
- **THEN** its stored media SHALL not be acquired until the card becomes visible

#### Scenario: Image preview

- **WHEN** the user activates an image card preview
- **THEN** the existing full-size preview SHALL open using the stored reference without altering the canvas node
