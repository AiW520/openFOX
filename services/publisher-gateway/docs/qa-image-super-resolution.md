# Image Super Resolution Verification

Verified locally on 2026-10-14 using the existing Real-ESRGAN service in
`D:/图片超分`, the publisher gateway and the OpenTu development frontend.
Existing images were reused; verification did not invoke paid image generation.

## Real Inference And Canvas Checks

- A 1024 x 1024 image produced a 4096 x 4096 PNG with the anime model.
- Automatic photo-model enhancement produced 384 x 256 from 96 x 64.
- Manual 2x enhancement produced 192 x 128 from the same original.
- Workflow and free canvases retained their node positions and layout dimensions.
- Original and HD downloads contained the expected pixel dimensions.
- Refresh retained the enhanced image, task identity and downloadable original.
- Desktop (1440 x 1000) and mobile (390 x 844) views were exercised.
- Browser acceptance completed without page errors.

The browser acceptance script and screenshots are local artifacts under the
ignored workspace `tmp/` directory. They are not deployment assets.

## Automated Checks

- Publisher gateway, administrator and shared settings tests: 31 passed.
- Enhancement lifecycle tests: 5 passed, including cancellation, recovery,
  completed idempotent submissions and result download failure.
- Drawnix and Web TypeScript checks passed.
- The production web build and Service Worker build passed.
- OpenSpec strict validation passed for `add-image-super-resolution`.

## Production Status

Production enhancement is disabled until both `PUBLISHER_UPSCALER_URL` and
`PUBLISHER_UPSCALER_TOKEN` are configured on the gateway. The current website
host must not run inference. Provision an independent private inference service
and verify GPU capacity, memory, latency, concurrency and representative image
quality before enabling automatic enhancement.

Gateway results currently require an operator-managed retention policy; automatic
disk cleanup is not implemented. Monitor disk usage and arrange private backups.
The inference token is stored only on the server and is never sent to browsers.
