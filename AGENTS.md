## Learned User Preferences

- Prefers autonomous dependency-rolling design that does not require routine human review.
- Treats browser console warnings (referrer-policy, Robustext SharedArrayBuffer, CORB on telemetry) as non-actionable when they are graceful degradation with no functional impact.
- Prefers direct execution for release tasks (commit, sync, push) once fixes are validated.
- Does not want large R2-hosted model files proxied through Rails; fix access with R2/Cloudflare CORS instead.
- When optimizing visual effects, preserve pixel-perfect appearance unless explicitly told otherwise.

## Learned Workspace Facts

- `geor.me` production/CI Docker builds run on Linux amd64, so `Gemfile.lock` must include `x86_64-linux` alongside local macOS platforms.
- The homepage Robustext embed is same-origin, must keep pointer/keyboard interactivity, and must be fully destroyed/re-instantiated via Stimulus `robustext-embed` on carousel slide mount/unmount (Emscripten breaks with inline scripts and cloneNode remounts).
- Page content renders inside a CRT barrel-filter stack (`.scanlines` outside; SVG `feDisplacementMap` on `#crt-content` and `.crt-shell` overlays inside `foreignObject`); Lenis smooth-scrolls the inner content.
- The custom cursor, Oneko, and click hearts live in `.crt-shell` inside the CRT filter; cursor and Oneko use `data-turbo-permanent` with saved state so they stay seamless across Turbo navigations.
- App responses set COEP and COOP to `unsafe-none` site-wide so third-party iframe embeds (e.g. Umami share, Robustext) work.
- Production layout does not load the Umami tracking script; `/data` still embeds the Umami share iframe.
- DeepSeek browser model shards load directly from `r2.geor.me` and require R2/Cloudflare CORS (GET, HEAD, Range), not an app proxy.
- Lunar background texture (`lunar-texture.avif`) must be generated via Chromium/Playwright SVG capture plus `avifenc --lossless` (`bun run generate:lunar-texture`); CRT displacement map stays PNG for SVG `feImage` compatibility.
