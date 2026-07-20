// First-party Swetrix boot (production). Survives Zaraz/adblock of the tag manager;
// still needs information.geor.me + swetrixapi.geor.me to be reachable.
const PID = "iatEqM00P5FA";
const API_URL = "https://swetrixapi.geor.me/log";
const SCRIPT_SRC = "https://information.geor.me/";

let loadPromise;

function loadSwetrixScript() {
  if (typeof globalThis.swetrix !== "undefined") {
    return Promise.resolve(globalThis.swetrix);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(globalThis.swetrix), {
        once: true,
      });
      existing.addEventListener("error", () => resolve(null), { once: true });
      // Already finished loading before listeners attached.
      if (typeof globalThis.swetrix !== "undefined") resolve(globalThis.swetrix);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.defer = true;
    script.onload = () => resolve(globalThis.swetrix || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return loadPromise;
}

async function ensureSwetrix() {
  if (import.meta.env.DEV) return null;

  try {
    const swetrix = await loadSwetrixScript();
    if (!swetrix) return null;

    if (!globalThis.__swetrixInited) {
      swetrix.init(PID, { apiURL: API_URL });
      try {
        swetrix.trackErrors?.();
      } catch {
        /* optional */
      }
      globalThis.__swetrixInited = true;
    }
    return swetrix;
  } catch {
    return null;
  }
}

async function trackPageview() {
  const swetrix = await ensureSwetrix();
  if (!swetrix) return;
  try {
    swetrix.trackViews();
  } catch {
    /* ignore */
  }
}

document.addEventListener("turbo:load", () => {
  void trackPageview();
});
