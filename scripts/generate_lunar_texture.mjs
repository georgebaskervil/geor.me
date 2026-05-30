#!/usr/bin/env bun
/**
 * Render the lunar feTurbulence tile in Chromium and export lossless AVIF.
 *
 * Matches the former inline SVG on `html` (see docs/lunar-texture.md).
 * Requires avifenc (libavif) on PATH for the PNG → AVIF step.
 * Usage: bun scripts/generate_lunar_texture.mjs [outputPath]
 */

import { execFileSync } from "node:child_process";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SIZE = 300;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath =
  process.argv[2] || path.join(root, "app", "images", "lunar-texture.avif");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
    }
    svg {
      display: block;
      width: ${SIZE}px;
      height: ${SIZE}px;
    }
  </style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <defs>
      <filter id="lunar" x="0" y="0">
        <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="5" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="#9e9e9e" filter="url(#lunar)" opacity="0.19"/>
  </svg>
</body>
</html>`;

await mkdir(path.dirname(outPath), { recursive: true });

const tmpPng = path.join(path.dirname(outPath), `.lunar-texture-${process.pid}.png`);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "load" });
await page.locator("svg").screenshot({
  path: tmpPng,
  omitBackground: true,
  type: "png",
});
await browser.close();

try {
  execFileSync("avifenc", [tmpPng, outPath, "--lossless"], { stdio: "inherit" });
} finally {
  await unlink(tmpPng).catch(() => {});
}

console.log(`Wrote ${outPath}`);
