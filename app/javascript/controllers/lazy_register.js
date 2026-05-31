import { Controller } from "@hotwired/stimulus";
import { application } from "./application";
import { assetLog } from "../utils/assetLoadLog.js";

/** @type {Map<string, Promise<void>>} */
const pendingLoads = new Map();

/** Loaded on demand when distraction mode is first activated. */
const LAZY_CONTROLLER_SKIP = new Set(["./distractionmode_controller.js"]);

export function identifierFromControllerPath(path) {
  return path
    .replace(/^\.\//, "")
    .replace(/_controller\.(js|coffee)$/, "")
    .replace(/_/g, "-");
}

function loadAndSwapController(identifier, importFn) {
  const existing = pendingLoads.get(identifier);
  if (existing) return existing;

  const startedAt = performance.now();
  assetLog("Stimulus chunk load start", identifier);

  const load = importFn()
    .then((module) => {
      const ControllerClass = module.default;
      if (!ControllerClass) {
        throw new Error(
          `Missing default export for Stimulus controller "${identifier}"`,
        );
      }
      assetLog("Stimulus chunk ready", identifier, {
        ms: Math.round(performance.now() - startedAt),
      });
      application.unload(identifier);
      application.register(identifier, ControllerClass);
    })
    .catch((error) => {
      application.handleError(
        error,
        `Failed to load Stimulus controller "${identifier}"`,
        { identifier },
      );
      throw error;
    })
    .finally(() => {
      pendingLoads.delete(identifier);
    });

  pendingLoads.set(identifier, load);
  return load;
}

/**
 * Stimulus 3 register() requires a Controller class with shouldLoad.
 * This placeholder loads the real chunk on first connect, then swaps it in;
 * existing scopes for that identifier are reconnected automatically.
 */
export function defineLazyController(identifier, importFn) {
  return class LazyStimulusController extends Controller {
    static shouldLoad = true;

    connect() {
      loadAndSwapController(identifier, importFn).catch(() => {});
    }
  };
}

export function registerLazyControllers(controllerModules) {
  const count = Object.keys(controllerModules).length;
  assetLog("lazy Stimulus registration", { controllers: count });

  for (const path in controllerModules) {
    if (LAZY_CONTROLLER_SKIP.has(path)) continue;

    const identifier = identifierFromControllerPath(path);
    application.register(
      identifier,
      defineLazyController(identifier, controllerModules[path]),
    );
  }
}
