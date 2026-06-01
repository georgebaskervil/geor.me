import { assetLog } from "./assetLoadLog.js";

const WEB_LLM_SRC = "/vendor/web-llm/index.js";

let modulePromise;

/** Load WebLLM from public/vendor (not Vite-bundled; lib/index.js breaks Rolldown). */
export function loadWebLLM() {
  if (!modulePromise) {
    assetLog("web-llm load start", WEB_LLM_SRC);
    const startedAt = performance.now();
    modulePromise = import(/* @vite-ignore */ WEB_LLM_SRC).then((mod) => {
      assetLog("web-llm ready", WEB_LLM_SRC, {
        ms: Math.round(performance.now() - startedAt),
      });
      return mod;
    });
  }
  return modulePromise;
}
