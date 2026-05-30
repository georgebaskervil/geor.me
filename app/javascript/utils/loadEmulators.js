import emulatorsScriptUrl from "emulators/dist/emulators.js?url";

let loadPromise;

/** Load the prebuilt browserify emulators bundle without re-bundling it into vendor-modules. */
export function loadEmulators() {
  if (globalThis.emulators) {
    return Promise.resolve(globalThis.emulators);
  }

  loadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = emulatorsScriptUrl;
    script.async = true;
    script.addEventListener("load", () => {
      if (globalThis.emulators) {
        resolve(globalThis.emulators);
        return;
      }
      reject(new Error("emulators.js loaded but window.emulators is missing"));
    });
    script.onerror = () => reject(new Error("Failed to load emulators.js"));
    document.head.append(script);
  });

  return loadPromise;
}
