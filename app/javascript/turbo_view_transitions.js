import * as Turbo from "@hotwired/turbo";
import { performTransition } from "turbo-view-transitions";

export function shouldPerformTransition() {
  // Support view transitions even when the user prefers reduced motion.
  return typeof document !== "undefined" && "startViewTransition" in document;
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
