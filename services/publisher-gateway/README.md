# Publisher Trial

This optional service offers temporary shared models through a private server
API Key. Personal providers, catalogs and presets remain available in both app
experiences and do not require a trial code.

## Configuration

Open `/publisher`, log in with the administrator password and set the provider
endpoint and API Key. Use **获取模型**, select models in the original provider
discovery dialog, choose **添加模型**, then save. A blank key preserves the
server's saved key; reading settings never returns it.

Visitors can use their own providers directly. The key icon at the bottom right
opens **平台体验**, where the trial code activates the shared provider. Exiting
the trial removes only shared settings and restores the earlier preset.

## Build And Verify

```powershell
pnpm publisher:build-ui
$env:VITE_PUBLISHER_MODE = '1'
pnpm exec vite build --config apps/web/vite.config.ts
pnpm exec vite build --config apps/web/vite.sw.config.ts
pnpm publisher:test
```

The gateway uses Node.js 22.6 or later for tests that strip TypeScript types.
Credentials belong in the private environment file and server data directory,
never in frontend build variables. The configured Tuzi HTTPS endpoints are
allowlisted and shared image generation supports `gpt-image-2`.

## Capacity

`limits.concurrency` bounds active generation POST requests (default 2, maximum 4).
Owned result/task GET requests use `limits.queryConcurrency` independently
(default 2, maximum 4). Existing configuration files and older admin clients
remain compatible; omitting the query setting preserves its saved value.
The local model catalog does not consume an upstream slot.

Generation requests wait in a process-local FIFO queue with at most 8 waiting
connections and a 30-second wait limit. The gateway reads the request body and
reserves daily usage only after acquiring a generation slot and validating the
request. Queue overflow and expiry return HTTP 429 with `Retry-After: 5`;
disconnected requests leave the queue. This is a short burst buffer, not a
durable job system; requests are not retained across restarts.

JSON responses reuse upstream byte chunks instead of cloning every chunk; a
single-chunk response also avoids concatenation. They are still fully buffered
and parsed to validate JSON and track
task ownership. A response may contain at most 128 MiB, and concurrent proxy JSON
responses share a 128 MiB input-byte budget until delivery finishes. This is not
a limit on process RSS: decoded strings, parsed data, uploads, and runtime memory
also contribute. Binary responses continue to stream. Images remain browser-side;
this change does not reduce transfer bandwidth or provider generation time.

## Local development

The Vite `serve` command enables the trial entry by default and proxies publisher
requests to the deployed gateway. The same experience code works locally and
online; the server API key is never copied into the local frontend. Use
`OPENTU_PUBLISHER_PROXY_TARGET` to select another gateway.

For personal-provider development without the trial entry, set
`VITE_PERSONAL_MODE=1` before starting the dev server. Production builds still
require the explicit `VITE_PUBLISHER_MODE=1` flag.

## Optional Image Super Resolution

Set `PUBLISHER_UPSCALER_URL` to the private Real-ESRGAN service origin (no path,
query or credentials) and `PUBLISHER_UPSCALER_TOKEN` to its bearer token in the
gateway environment. Restart the gateway. Leaving either unset disables
enhancement without affecting generation or personal providers. The frontend
never receives this token. Use the separately maintained service at
`D:/图片超分` for local integration; production needs an independent inference host.

Both canvases show generated originals immediately and automatically enhance new
image results whose longest edge is at most 2048 pixels: 4× through 1024, otherwise
2×. Existing images can use the AI super-resolution action with manual 2×/4× and
photo/anime models. These settings refer to pixel multiplication, not a video
4K preset: 1024×1024 becomes 4096×4096. Originals and canvas layout are preserved.
Only enhancement is retried after failure; source generation is never replayed.

Enhancement requires a trial or administrator session, checks mutation origins,
and binds tasks/results to the authenticated session's existing IP identity.
It accepts image bytes up to 50 MiB, never a URL for server-side fetching.
The service validates image dimensions and its own output limits. The gateway
allows four active enhancement jobs and separately applies the existing daily
global/per-IP budget values to enhancement requests. Saturation preserves the
original and returns a retryable UI error. Service requests time out after 90
seconds; job polling runs every five seconds and stops after the service's
24-hour task lifetime. Result transfers are capped at 128 MiB and validated as
PNG with matching dimensions before completion.

The gateway persists task metadata and completed PNGs under
`PUBLISHER_DATA_DIR/enhancement`; the browser also persists originals, task IDs
and results in IndexedDB. Refresh resumes the same task. Configure private
backups, disk monitoring and a retention policy before production: automatic
disk deletion is not implemented. Do not expose the inference service directly
to the public internet. Validate available memory, GPU throughput, queue capacity,
text/face/transparent-image quality and actual latency before enabling automatic
enhancement. The current web host remains unconfigured for inference.

See `docs/qa-image-super-resolution.md` for local verification evidence.

## Removal

Rebuild the app without `VITE_PUBLISHER_MODE=1` to remove the trial entry and
clean stale shared settings on startup. Personal providers remain intact.
Disable the gateway service and publisher Nginx routes when the trial ends.

The existing install script is for initial provisioning. Updates to an already
deployed instance should switch an application release and restart the gateway,
preserving its environment, private data and TLS configuration.
