#!/usr/bin/env bun
/**
 * Encode a PNG as lossless AVIF via avifenc (libavif).
 * Usage: bun scripts/encode_lossless_avif.mjs <input.png> [output.avif]
 */

import { execFileSync } from "node:child_process";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: bun scripts/encode_lossless_avif.mjs <input.png> [output.avif]");
  process.exit(1);
}

const output =
  process.argv[3] ||
  input.replace(/\.png$/i, ".avif").replace(/\.(png)$/i, ".avif");

execFileSync("avifenc", [input, output, "--lossless"], { stdio: "inherit" });
console.log(`Wrote ${path.resolve(output)}`);
