## Learned User Preferences
- Prefers autonomous dependency-rolling design that does not require routine human review.
- Treats browser referrer-policy warnings as non-actionable when they are graceful degradation with no functional impact.
- Prefers direct execution for release tasks (commit, sync, push) once fixes are validated.
- Does not want large R2-hosted model files proxied through Rails; fix access with R2/Cloudflare CORS instead.

## Learned Workspace Facts
- `geor.me` production/CI Docker builds run on Linux amd64, so `Gemfile.lock` must include `x86_64-linux` alongside local macOS platforms.
- The homepage Robustext embed is same-origin and must keep pointer/keyboard interactivity.
- The site uses Lenis-based smooth scrolling with a custom cursor overlay and Oneko companion effects.
- App responses set COEP and COOP to `unsafe-none` site-wide so third-party iframe embeds (e.g. Umami share, Robustext) work.
- Production layout does not load the Umami tracking script; `/data` still embeds the Umami share iframe.
- DeepSeek browser model shards load directly from `r2.geor.me` and require R2/Cloudflare CORS (GET, HEAD, Range), not an app proxy.
