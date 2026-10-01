## ADDED Requirements

### Requirement: The New Home SHALL Reuse Shared Dynamic Models

The new home SHALL derive selectable models from the same Provider profiles, runtime discovery and model catalog used by the existing AI input bar.

#### Scenario: Show Tuzi managed models

- **GIVEN** Tuzi startup synchronization created a managed Provider for the selected group
- **WHEN** the user opens the new home model selector
- **THEN** the selector SHALL expose models from that Provider using the existing lazy discovery behavior
- **AND** SHALL show the Provider identity used by the existing selector

#### Scenario: Distinguish the same model across Providers

- **GIVEN** two Providers expose the same model ID
- **WHEN** the user selects one of them
- **THEN** the new home SHALL retain the selected `ModelRef`
- **AND** the canvas prefill SHALL include that `ModelRef` rather than routing by model ID alone

#### Scenario: Change generation type

- **WHEN** the user changes between image, video, audio and text generation
- **THEN** the model selector SHALL use the matching shared model collection
- **AND** SHALL restore or choose a valid model for that generation type

### Requirement: The New Home SHALL Reuse Compatible Model Parameters

The new home SHALL render and sanitize parameters using the same compatibility definitions and defaults as the existing generation controls.

#### Scenario: Select a model with supported parameters

- **WHEN** a model is selected
- **THEN** the home SHALL show only parameters defined as compatible with that model
- **AND** SHALL initialize valid defaults through the shared preference rules

#### Scenario: Switch to a model with different capabilities

- **GIVEN** the current selection contains parameters unsupported by another model
- **WHEN** the user switches to that model
- **THEN** unsupported parameters SHALL disappear
- **AND** SHALL NOT be included in the canvas prefill

#### Scenario: Prefill the shared canvas input

- **GIVEN** the user prepared a prompt with a selected generation type, model source and parameters
- **WHEN** the user starts creating
- **THEN** the shared AI input bar SHALL receive the same prompt, generation type, model ID, `ModelRef` and sanitized parameters
- **AND** final submission SHALL continue through the existing task and Provider routing pipeline
