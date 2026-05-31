import * as Turbo from "@hotwired/turbo";
import {
  performTransition,
  shouldPerformTransition as libraryShouldPerformTransition,
} from "turbo-view-transitions";

export function shouldPerformTransition() {
  if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return libraryShouldPerformTransition();
}

document.addEventListener("turbo:before-render", (event) => {
  if (!shouldPerformTransition()) return;

  event.preventDefault();

  performTransition(document.body, event.detail.newBody, async () => {
    await event.detail.resume();
  });
});

document.addEventListener("turbo:load", () => {
  if (shouldPerformTransition()) {
    Turbo.cache.exemptPageFromCache();
  }
});
