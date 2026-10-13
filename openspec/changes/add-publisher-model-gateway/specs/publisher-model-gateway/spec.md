## ADDED Requirements
### Requirement: Private publisher credentials
The service SHALL store upstream API credentials only on the server and SHALL
exclude them from public configuration, administrator reads and error responses.

#### Scenario: Visitor obtains shared configuration
- **WHEN** an authenticated visitor loads the shared model catalog
- **THEN** the catalog contains model identifiers and public routing metadata
- **AND** contains no upstream credentials

### Requirement: Access control and bounded usage
The gateway SHALL require a visitor session for upstream requests, an administrator
session for configuration writes, same-origin mutations, selected model validation,
persistent per-IP and global daily quotas and bounded concurrent requests.

#### Scenario: Unauthorized or disallowed generation
- **WHEN** an unauthenticated visitor requests generation or selects an unlisted model
- **THEN** the request is rejected without contacting the upstream provider

#### Scenario: Exhausted daily quota
- **WHEN** a tester reaches the daily request limit and logs in again
- **THEN** further generation requests remain blocked for that day

### Requirement: Existing experience integration
Both experiences SHALL use the shared configured model catalog through the same
server gateway when publisher mode is enabled.

#### Scenario: Shared model generation
- **WHEN** a visitor selects a publisher model in either experience
- **THEN** the browser calls the same-origin gateway
- **AND** only the gateway adds the real upstream credential

### Requirement: Optional trial and personal configuration preservation
The app SHALL allow personal provider configuration without a trial code and SHALL
add shared settings without replacing personal suppliers, catalogs or presets.

#### Scenario: Enter and exit trial with personal configuration
- **WHEN** a user activates platform trial and later exits
- **THEN** the personal credentials and model selections remain unchanged
- **AND** only shared entries are removed and the prior active preset is restored

### Requirement: Reused administrator model discovery
The publisher page SHALL reuse the personal provider model discovery picker and
SHALL retrieve upstream models through an administrator-only server endpoint.

#### Scenario: Fetch models using a saved publisher key
- **WHEN** an administrator leaves the key blank and fetches models
- **THEN** the server uses the stored key and returns only model metadata
- **AND** the existing picker supports searching and selecting models to add
