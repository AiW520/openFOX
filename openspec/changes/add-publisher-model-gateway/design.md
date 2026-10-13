## Decisions
- Keep actual credentials in a mode-0600 server file outside the static directory.
  The publisher UI writes credentials but never reads them back.
- Use opaque HttpOnly, Secure, SameSite cookies and separate administrator and
  visitor sessions. Mutations require a same-origin Origin header.
- Limit upstream destinations to HTTPS Tuzi API hosts and explicit generation
  endpoints. Enforce selected models on the server, plus per-IP, global daily
  request limits and a global concurrency limit. Quotas survive process restarts.
- Preserve the original public upstream base URL for existing protocol inference;
  map the non-secret publisher credential marker to the same-origin gateway
  in provider transport. The service worker uses the same transport.
- Build locally; run the small dependency-free service with systemd and bind it
  only to localhost. Nginx terminates HTTPS and serves frontend files.

## Risks / Trade-offs
- A shared access code identifies a tester by IP and session, not a user account.
  Multiple testers behind the same public IP share a daily quota.
- Request quotas are not monetary accounting. The publisher must also set the
  provider token's credit limit for a hard spending cap.
- The initial gateway supports standard OpenAI/Google image, text, video and
  audio routes used by Tuzi. Unsupported custom routes are denied by default.
- Public wildcard DNS is a temporary test address, not a publisher-owned domain.

## Migration / Rollback
The gateway mode is opt-in at build time. Local browser settings retain their
normal behavior in other builds. Rollback stops only the new systemd service and
removes only the new Nginx virtual host; private configuration stays outside builds.
