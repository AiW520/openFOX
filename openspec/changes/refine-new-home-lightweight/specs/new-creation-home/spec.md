## ADDED Requirements

### Requirement: Lightweight Creation Home
The home SHALL present one prompt composer, shared model and parameter controls, a canvas entry and a horizontally browsable model showcase with real selectable models.

#### Scenario: Select a model from the showcase
- **WHEN** the user selects a visible image or video model card
- **THEN** the existing model selection and provider route SHALL populate the composer
- **AND** the selected model SHALL be shown as selected without submitting a generation request.

#### Scenario: Browse model recommendations
- **WHEN** the user browses the showcase
- **THEN** image models SHALL appear in the upper photo-wall row and video models in the lower row, without a category toggle
- **AND** rounded illustrated cards SHALL retain vendor, description and source information, with a compact additional area for configured text/Agent and audio models
- **AND** models marked as new and higher-scored site recommendations SHALL be placed ahead of older aliases while retaining vendor diversity in the first visible cards
- **AND** horizontal navigation SHALL remain available on narrow screens.

#### Scenario: Control photo-wall motion
- **WHEN** automatic motion is enabled
- **THEN** the two rows SHALL move slowly in opposite directions only when overflowing and visible
- **AND** the user SHALL be able to pause the motion, with hover, keyboard exploration and touch exploration stopping automatic motion
- **AND** reduced-motion preferences and hidden-page/offscreen states SHALL stop automatic motion
- **AND** keyboard and manual navigation SHALL expose every configured showcase model without submitting a generation request.

#### Scenario: Choose a larger image count
- **WHEN** the user opens the homepage quantity control
- **THEN** the existing supported options 1, 2, 3, 4, 5, 10 and 20 SHALL be available
- **AND** the selected count SHALL be handed off to the existing canvas composer.

#### Scenario: Enter from the homepage composer
- **WHEN** the user presses Enter with a non-empty draft and a selected model
- **THEN** the homepage SHALL hand off the same prompt, provider, model, parameters and count as the canvas entry button
- **AND** it SHALL open the new canvas without submitting a generation request
- **AND** Shift+Enter, held-key repeats and IME confirmation SHALL NOT trigger navigation.

#### Scenario: Optimize a homepage prompt
- **WHEN** the user opens prompt optimization from the homepage
- **THEN** the shared optimizer SHALL receive the draft and the active creation scenario
- **AND** opening the optimizer SHALL NOT initiate optimization or generation
- **AND** applying a result SHALL update the homepage draft and restore focus without navigating
- **AND** closing without applying SHALL preserve the original draft.

### Requirement: Share Site Introduction
Site sharing SHALL provide an introduction link without canvas identifiers, query credentials or fragments, with explicit copy feedback.

#### Scenario: Preview the site introduction
- **WHEN** a visitor opens the shared introduction URL
- **THEN** project capabilities and a start-creation link SHALL be available without model configuration.

#### Scenario: Clipboard is unavailable
- **WHEN** link copying is denied
- **THEN** the interface SHALL select the visible URL for manual copying without reporting success.
