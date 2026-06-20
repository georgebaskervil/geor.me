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
    this.displacementImage = document.querySelector("#crt-displacement-image");
    this.foreignObject = document.querySelector("#crt-foreign-object");
    this.syncForeignObjectDimensions();
    this.preloadDisplacementMap();
    this.updateScale();
    this.onResize = () => {
      if (this.resizeFrame) return;
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = undefined;
        this.syncForeignObjectDimensions();
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
    if (this.displacementObjectUrl) {
      URL.revokeObjectURL(this.displacementObjectUrl);
      this.displacementObjectUrl = undefined;
    }
  }

  syncForeignObjectDimensions() {
    const foreignObject = this.foreignObject;
    if (!foreignObject) return;

    // Safari mishandles percentage-sized foreignObject inside filtered SVG.
    foreignObject.setAttribute("width", String(window.innerWidth));
    foreignObject.setAttribute("height", String(window.innerHeight));
  }

  async preloadDisplacementMap() {
    const image = this.displacementImage;
    if (!image) return;

    const href =
      image.getAttribute("href") ||
      image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!href || href.startsWith("blob:")) return;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }

    // Same-origin feImage URLs work in Safari; blob preload is only for cross-origin CDN fallbacks.
    if (url.origin === window.location.origin) return;

    try {
      const response = await fetch(href);
      if (!response.ok) return;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      this.displacementObjectUrl = objectUrl;
      image.setAttribute("href", objectUrl);
      image.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        objectUrl,
      );
    } catch {
      // Keep original href if preload fails.
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
