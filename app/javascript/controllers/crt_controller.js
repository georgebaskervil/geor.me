import { Controller } from "@hotwired/stimulus";

// Barrel displacement scale for #barrel (viewport-relative, matches legacy inline script).
export default class extends Controller {
  static values = {
    baseScale: { type: Number, default: 80 },
    strength: { type: Number, default: 0.95 },
    referenceWidth: { type: Number, default: 1024 },
  };

  connect() {
    this.displacement = document.querySelector("#crt-displacement");
    this.updateScale();
    this.onResize = () => {
      if (this.resizeFrame) return;
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = undefined;
        this.updateScale();
      });
    };
    window.addEventListener("resize", this.onResize);
  }

  disconnect() {
    window.removeEventListener("resize", this.onResize);
    if (this.resizeFrame) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = undefined;
    }
  }

  updateScale() {
    if (!this.displacement) return;
    const scale =
      this.baseScaleValue *
      (window.innerWidth / this.referenceWidthValue) *
      this.strengthValue;
    this.displacement.setAttribute("scale", String(scale));
  }
}
