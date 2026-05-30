#!/usr/bin/env bun
/**
 * Capture CRT viewport screenshots for before/after comparison.
 * Usage: bun scripts/crt_visual_snapshot.mjs [baseUrl] [outputDir]
 * Example: bun scripts/crt_visual_snapshot.mjs http://localhost:3000 tmp/crt-snapshots
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://localhost:3000";
const outputDir = process.argv[3] || "tmp/crt-snapshots";

const viewports = [
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const pages = [
  { name: "home", path: "/" },
  { name: "posts", path: "/posts" },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const manifest = [];

for (const viewport of viewports) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });

  for (const route of pages) {
    const url = `${baseUrl.replace(/\/$/, "")}${route.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(500);

    const topName = `${route.name}-${viewport.name}-top.png`;
    await page.screenshot({
      path: path.join(outputDir, topName),
      fullPage: false,
    });
    manifest.push(topName);

    await page.evaluate(() => {
      const wrapper = document.querySelector("#crt-content");
      if (wrapper) wrapper.scrollTop = wrapper.scrollHeight / 2;
      globalThis.lenis?.scrollTo(wrapper.scrollHeight / 2, { immediate: true });
    });
    await page.waitForTimeout(400);

    const midName = `${route.name}-${viewport.name}-mid.png`;
    await page.screenshot({
      path: path.join(outputDir, midName),
      fullPage: false,
    });
    manifest.push(midName);
  }
}

await writeFile(
  path.join(outputDir, "manifest.json"),
  JSON.stringify(
    { baseUrl, capturedAt: new Date().toISOString(), files: manifest },
    null,
    2,
  ),
);

await browser.close();
console.log(`Wrote ${manifest.length} screenshots to ${outputDir}`);
