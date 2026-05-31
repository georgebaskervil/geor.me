import { Controller } from "@hotwired/stimulus";

// Creates and destroys the Robustext iframe so Emscripten fully resets on each mount.
export default class extends Controller {
  static values = {
    src: { type: String, default: "/robustext-embed.html" },
  };

  connect() {
    this.mount();
  }

  disconnect() {
    this.destroy();
  }

  mount() {
    this.destroy();

    const iframe = document.createElement("iframe");
    iframe.title = "Robustext";
    iframe.loading = "lazy";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("tabindex", "-1");
    iframe.src = this.srcValue;

    this.iframe = iframe;
    this.element.append(iframe);
  }

  destroy() {
    if (this.iframe) {
      this.iframe.src = "about:blank";
      this.iframe.remove();
      this.iframe = undefined;
    }

    for (const stale of this.element.querySelectorAll("iframe")) {
      stale.src = "about:blank";
      stale.remove();
    }
  }
}
