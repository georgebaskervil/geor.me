import { Controller } from "@hotwired/stimulus";
import { createApp } from "vue";
import CursorFxWrapper from "../components/CursorFxWrapper.vue";

export default class extends Controller {
  connect() {
    if (globalThis.__georCapabilities?.customCursor === false) {
      this.element.hidden = true;
      this.element.setAttribute("aria-hidden", "true");
      return;
    }

    this.app = createApp(CursorFxWrapper);
    this.app.mount(this.element);
  }

  disconnect() {
    if (this.app) {
      this.app.unmount();
      this.app = undefined;
    }

    document.documentElement.classList.remove(
      "is-cursor-fx-active",
      "cursor-fx-ready",
    );
  }
}
