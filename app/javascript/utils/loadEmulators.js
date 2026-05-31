import emulatorsScriptUrl from "emulators/dist/emulators.js?url";
import wdosboxJsUrl from "emulators/dist/wdosbox.js?url";
import wdosboxWasmUrl from "emulators/dist/wdosbox.wasm?url";
import { assetLog } from "./assetLoadLog.js";

let loadPromise;
let hijackInstalled = false;

function installEmulatorUrlHijack() {
  if (hijackInstalled) return;
  hijackInstalled = true;
  assetLog("emulator URL hijack installed", {
    wdosboxJsUrl,
    wdosboxWasmUrl,
  });

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (url.includes("wdosbox.js")) url = wdosboxJsUrl;
    if (url.includes("wdosbox.wasm")) url = wdosboxWasmUrl;
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (resource, ...rest) {
    if (typeof resource === "string") {
      if (resource.includes("wdosbox.js")) resource = wdosboxJsUrl;
      if (resource.includes("wdosbox.wasm")) resource = wdosboxWasmUrl;
    }
    return originalFetch(resource, ...rest);
  };
}

/** Load the prebuilt browserify emulators bundle without re-bundling it into vendor-modules. */
export function loadEmulators() {
  installEmulatorUrlHijack();

  if (globalThis.emulators) {
    assetLog("emulators already on window");
    return Promise.resolve(globalThis.emulators);
  }

  if (loadPromise) {
    assetLog("emulators load in flight (shared promise)");
    return loadPromise;
  }

  assetLog("emulators load start", emulatorsScriptUrl);
  const startedAt = performance.now();

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = emulatorsScriptUrl;
    script.async = true;
    script.addEventListener("load", () => {
      if (globalThis.emulators) {
        assetLog("emulators ready", {
          ms: Math.round(performance.now() - startedAt),
        });
        resolve(globalThis.emulators);
        return;
      }
      reject(new Error("emulators.js loaded but window.emulators is missing"));
    });
    script.onerror = () => reject(new Error("Failed to load emulators.js"));
    document.head.append(script);
    assetLog("emulators script tag injected");
  }).catch((error) => {
    console.error("[geor.me/assets]", "emulators load failed", error);
    loadPromise = undefined;
    throw error;
  });

  return loadPromise;
}
