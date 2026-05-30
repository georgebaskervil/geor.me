# Box-shadow performance audit (May 2026)

Firefox profiles on the homepage CRT stack showed **~15–25% of samples** under `nsDisplayBoxShadowOuter::Paint`. Every shadow repaint is re-filtered through the CRT barrel warp, so shadow cost is amplified.

## Findings

| Source | Issue | Action taken |
|--------|--------|--------------|
| Tailwind `shadow-md` / `shadow-lg` | Two-layer blurred shadows (large paint cost) | Replaced with single-layer `$shadow-*` tokens in `variables.scss` |
| `transition-all` on squish-pressable cards | Interpolates every property on hover, including accidental shadow churn | Narrowed to `transition: transform …` on homepage/posts/images cards and carousel controls |
| `.drawer` | `0 4px 30px` blur + animated `box-shadow` on expand | Static single shadow; height-only transition (drawer still in codebase for other branches) |
| `.carousel-btn` `:active` | Box-shadow only on press via squish `@content` | Left unchanged (carousel blurs kept per product request) |
| `.floating-window` | Small `2px 2px 5px` shadow | Acceptable; page-specific chrome |

## Shadow tokens

Defined in `app/stylesheets/variables.scss`:

- `$shadow-sm` — cards, project tiles
- `$shadow-panel` — panels, carousel container
- `$shadow-drawer` — drawer chrome

Prefer these over Tailwind `shadow-md` / `shadow-lg` on hot paths.

## Carousel touch listener leak

`project_carousel_controller.coffee` stores `@boundHandleTouchStart` / `@boundHandleTouchEnd` once in `connect()` and passes the same references to `removeEventListener` — no leak. `startAutoAdvance` also guards with `@carouselInView` so resume after scroll/mouseleave cannot start the timer off-screen.

## Further work (not done)

- Paint-flash in DevTools to catch any remaining per-frame shadow invalidation during scroll.
- Pseudo-element shadows decoupled from transformed squish targets (larger refactor).
