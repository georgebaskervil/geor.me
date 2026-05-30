import { Controller } from "@hotwired/stimulus";

// Pauses off-screen Tailwind ping animations to reduce CRT filter input churn.
export default class extends Controller {
  connect() {
    this.tracked = new WeakSet();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.style.animationPlayState = entry.isIntersecting
            ? ""
            : "paused";
        }
      },
      { threshold: 0.05 },
    );
    this.mutationObserver = new MutationObserver(() => this.scan());
    this.mutationObserver.observe(this.element, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    this.scan();
  }

  disconnect() {
    this.observer.disconnect();
    this.mutationObserver.disconnect();
  }

  scan() {
    for (const element of this.element.querySelectorAll(".animate-ping")) {
      if (this.tracked.has(element)) continue;
      this.tracked.add(element);
      this.observer.observe(element);
    }
  }
}
