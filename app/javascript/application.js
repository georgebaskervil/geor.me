// Capability gate first — sets flags/classes before Stimulus controllers boot.
import "./capabilities";
import { shouldPerformTransition } from "./turbo_view_transitions";

// Core CSS is loaded via vite_stylesheet_tag in the layout (not bundled here).
import "./loadFonts";

// Blur overlay during navigation when View Transitions API is unavailable.
document.addEventListener("turbo:visit", () => {
  if (!shouldPerformTransition()) {
    document.body.classList.add("turbo-loading");
  }
});
document.addEventListener("turbo:load", () => {
  document.body.classList.remove("turbo-loading");
});

import { createSuperHover } from "./vendor/superhover.js";

// Always run super-hover so the check loop never sleeps on pointer idle.
// This ensures :hover styles (rewritten by postcss-super-hover to also match
// [data-super-hover-active]) stay live even after the pointer stops moving.
// We use selector "*" so every element can be a hover target (existing behavior).
createSuperHover({
  selector: "*",
  moveEventType: false,
  suspendWhenPointerIdle: false,
});

import "@hotwired/turbo-rails";
import "./turbo_view_transitions";
import "./controllers";
import "./live_updater";
import { registerServiceWorker } from "./register_service_worker";

registerServiceWorker();
