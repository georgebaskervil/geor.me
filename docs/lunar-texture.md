# Lunar background texture

The `html` background uses two tiled layers (see `app/stylesheets/globals.scss`):

1. **Star field** — `app/images/starfield.svg` (tiled 220×220).
2. **Lunar grain** — formerly an inline SVG with a live filter; now `app/images/lunar-texture.avif`.

## Former inline SVG (replaced)

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <filter id="lunar">
      <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="5" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="300" height="300" fill="#9e9e9e" filter="url(#lunar)" opacity="0.19"/>
</svg>
```

Tiled at `background-size: 300px 300px` over base colour `#2C2A2F`.

## Baked asset

- **File:** `app/images/lunar-texture.avif` (300×300, lossless RGBA AVIF)
- **Generator:** `scripts/generate_lunar_texture.mjs` (Chromium via Playwright → temporary PNG → `avifenc --lossless`)
- **npm script:** `bun run generate:lunar-texture`
- **Regen deps:** Playwright/Chromium and `avifenc` (libavif)

The tile is a transparent-background browser render of the SVG filter stack, then losslessly encoded to AVIF.

Regenerate after changing filter parameters in the script.

## Technical assets and AVIF

| Asset                      | Format        | Why                                                                   |
| -------------------------- | ------------- | --------------------------------------------------------------------- |
| `starfield.svg`            | SVG           | CSS `background-image` — keep SVG (tiny, no filters)                  |
| `turbo-loading-spinner.svg`| SVG           | Turbo visit overlay spinner (SMIL animation)                          |
| `lunar-texture.avif`       | Lossless AVIF | CSS `background-image` — AVIF is fine                                 |
| `crt-displacement-map.png` | PNG           | SVG `feImage` input; AVIF is not reliably decoded in filter pipelines |
| `favicon.jpg`              | JPEG          | Favicon / touch-icon — no AVIF support                                |

Other lossless AVIF candidates (e.g. doom cube `space.png`) can use `bun scripts/encode_lossless_avif.mjs` when the consumer is CSS or a normal `<img>` / fetch decode path.
