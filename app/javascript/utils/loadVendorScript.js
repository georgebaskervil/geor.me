import { assetLog } from "./assetLoadLog.js";

const scriptCache = new Map();

/** Inject a classic script tag once; dedupe concurrent loads by src. */
export function loadScriptOnce(src) {
  const cached = scriptCache.get(src);
  if (cached) {
    assetLog("vendor script cache hit", src);
    return cached;
  }

  assetLog("vendor script load start", src);
  const startedAt = performance.now();

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      assetLog("vendor script waiting on existing tag", src);
      if (existing.dataset.loaded === "true") {
        assetLog("vendor script ready (existing tag)", src, {
          ms: Math.round(performance.now() - startedAt),
        });
        resolve();
        return;
      }
      existing.addEventListener(
        "load",
        () => {
          assetLog("vendor script ready (existing tag load)", src, {
            ms: Math.round(performance.now() - startedAt),
          });
          resolve();
        },
        { once: true },
      );
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        assetLog("vendor script ready (injected tag)", src, {
          ms: Math.round(performance.now() - startedAt),
        });
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true },
    );
    document.head.append(script);
    assetLog("vendor script tag injected", src);
  }).catch((error) => {
    console.error("[geor.me/assets]", "vendor script load failed", src, error);
    throw error;
  });

  scriptCache.set(src, promise);
  return promise;
}

export function loadPhaser() {
  assetLog("loadPhaser requested");
  return loadScriptOnce("/vendor/phaser.min.js").then(() => {
    if (!globalThis.Phaser) {
      throw new Error("phaser.min.js loaded but global Phaser is missing");
    }
    assetLog("loadPhaser ready");
    return globalThis.Phaser;
  });
}

export function loadPlotly() {
  assetLog("loadPlotly requested");
  return loadScriptOnce("/vendor/plotly.js").then(() => {
    if (!globalThis.Plotly) {
      throw new Error("plotly.js loaded but global Plotly is missing");
    }
    assetLog("loadPlotly ready");
    return globalThis.Plotly;
  });
}
