import { Controller } from "@hotwired/stimulus";
import { application } from "./application";
import { assetLog } from "../utils/assetLoadLog.js";

const DEFERRED_CONTROLLER_ATTR = "data-distraction-deferred";

function connectDeferredControllers(scope) {
  for (const element of scope.querySelectorAll(`[${DEFERRED_CONTROLLER_ATTR}]`)) {
    const identifier = element.getAttribute(DEFERRED_CONTROLLER_ATTR);
    if (!identifier) continue;

    const controllers = (element.getAttribute("data-controller") || "")
      .split(/\s+/)
      .filter(Boolean);
    if (controllers.includes(identifier)) continue;

    element.setAttribute(
      "data-controller",
      controllers.length ? `${controllers.join(" ")} ${identifier}` : identifier,
    );
    application.router.proposeToConnectScopeForElementAndIdentifier(
      element,
      identifier,
    );
  }
}

export default class extends Controller {
  static values = {
    scope: { type: String, default: "distractionmode-scope" },
  };

  #mounted = false;

  async activate() {
    const scope = document.getElementById(this.scopeValue);
    if (!scope) return;

    if (this.#mounted) {
      const distraction = application.getControllerForElementAndIdentifier(
        scope,
        "distractionmode",
      );
      distraction?.toggleDistractionMode();
      return;
    }

    const startedAt = performance.now();
    assetLog("distraction mode load start");

    const { default: DistractionmodeController } = await import(
      "./distractionmode_controller.js"
    );

    application.register("distractionmode", DistractionmodeController);
    scope.setAttribute("data-controller", "distractionmode");
    application.router.proposeToConnectScopeForElementAndIdentifier(
      scope,
      "distractionmode",
    );

    connectDeferredControllers(scope);
    // Let Stimulus connect deferred controllers before toggle (they miss the event otherwise).
    await Promise.resolve();

    assetLog("distraction mode ready", {
      ms: Math.round(performance.now() - startedAt),
    });

    this.#mounted = true;

    const distraction = application.getControllerForElementAndIdentifier(
      scope,
      "distractionmode",
    );
    if (distraction && !distraction.areWindowsVisible) {
      distraction.toggleDistractionMode();
    }
  }
}
