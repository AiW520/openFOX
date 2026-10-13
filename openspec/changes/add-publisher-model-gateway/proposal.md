# Change: Publisher model gateway

## Why
Browser settings cannot share publisher credentials safely with other visitors.
The publisher needs a private server configuration and an access-code test site.

## What Changes
- Add a Node service with publisher login, private configuration, visitor access codes,
  same-origin authenticated model forwarding and persistent request quotas.
- Reuse existing provider routing in both experiences with public model metadata
  and a non-secret credential marker.
- Add a publisher management page and deploy the static build behind HTTPS Nginx
  on op.47.107.92.13.nip.io, without changing the existing site.
- Reuse the original custom-provider credential field, model adapter and discovery
  picker in the publisher page. Model discovery uses a private admin server endpoint.
- Preserve personal suppliers, credentials, catalogs and presets. Trial access is
  optional, adds a separate provider and is removable with the publisher feature flag.

## Impact
- Affected specs: publisher-model-gateway, provider-routing.
- Affected code: services/publisher-gateway, provider transport, app bootstrap.
- Approved in chat: user selected the project service proxy, visitor access codes
  and a temporary DNS address on the inspected aliyun-server.
- Updated in chat: user explicitly requested reuse of the original provider UI and
  retention of personal providers; publisher sharing is a temporary trial feature.
