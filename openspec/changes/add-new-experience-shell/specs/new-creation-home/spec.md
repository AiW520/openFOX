## ADDED Requirements

### Requirement: The New Experience SHALL Provide A Creation Home

The new experience SHALL provide a responsive creation home that prepares a generation request before entering the shared canvas.

#### Scenario: Prepare a creation

- **WHEN** the user opens 新版本
- **THEN** the home SHALL offer a prompt input, generation type, model selector, compatible parameters and an enter-canvas action
- **AND** the primary controls SHALL remain usable without overlap at desktop and mobile widths

#### Scenario: Open the current canvas without a prompt

- **GIVEN** the user does not want to prefill a generation
- **WHEN** the user chooses the canvas entry
- **THEN** the application SHALL open the existing current board without requiring a prompt

#### Scenario: Return from the new canvas

- **GIVEN** the user is using the shared canvas through 新版本
- **WHEN** the user chooses to return to the new home
- **THEN** the application SHALL show the creation home
- **AND** SHALL preserve the current board in the shared workspace

### Requirement: Publication Actions SHALL Reflect Server Capability

Public publishing and featured review SHALL only be enabled when backed by an authenticated server contract.

#### Scenario: Server publication contract is unavailable

- **GIVEN** the server does not expose the required publication and review APIs
- **WHEN** the user uses the first-phase new experience
- **THEN** the application SHALL NOT report a local draft as publicly published or featured
- **AND** SHALL NOT allow the user to directly assign featured status

