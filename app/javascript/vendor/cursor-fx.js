const SCALE_MIN = 0.5;
const SCALE_MAX = 1;

const lerp = (a, b, n) => (1 - n) * a + n * b;

const getMousePos = (event, iframe = null) => {
  const e = event || window.event;
  let x = e.clientX ?? 0;
  let y = e.clientY ?? 0;

  if (iframe) {
    const rect = iframe.getBoundingClientRect();
    x += rect.left;
    y += rect.top;
  }

  return { x, y };
};

const isIframeSameOrigin = (iframe) => {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return false;
    void iframe.contentWindow.location.href;
    return true;
  } catch {
    return false;
  }
};

export default class CursorFx {
  constructor({ el, base_class }, options = {}) {
    this.DOM = { el };
    this.$options = Object.freeze({
      mixBlendMode: null,
      lerps: {
        dot: 1,
        circle: 0.18,
        custom: 0.23,
      },
      scale: {
        ratio: 0.18,
        min: SCALE_MIN,
        max: SCALE_MAX,
      },
      opacity: 0.1,
      ...options,
    });

    this.DOM.dot = this.DOM.el.querySelector(`${base_class}__inner__inside`);
    this.DOM.circle = this.DOM.el.querySelector(
      `${base_class}__inner__outside`,
    );
    this.DOM.custom = this.DOM.el.querySelector(`${base_class}__inner__custom`);

    this.bounds = {
      dot: this.DOM.dot ? this.DOM.dot.getBoundingClientRect() : null,
      circle: this.DOM.circle ? this.DOM.circle.getBoundingClientRect() : null,
      custom: this.DOM.custom ? this.DOM.custom.getBoundingClientRect() : null,
    };

    for (const key of ["dot", "circle", "custom"]) {
      const node = this.DOM[key];
      const bounds = this.bounds[key];
      if (!node || !bounds || bounds.width) continue;

      const styles = window.getComputedStyle(node);
      bounds.width = Number.parseInt(
        styles.getPropertyValue("width").replace("px", ""),
        10,
      );
      bounds.height = Number.parseInt(
        styles.getPropertyValue("height").replace("px", ""),
        10,
      );
    }

    this.scale = this.$options.scale.min;
    this.lastScale = this.$options.scale.max;
    this.opacity = this.$options.opacity;
    this.lastOpacity = 1;

    this.mousePos = { x: 0, y: 0 };
    this.lastMousePos = {
      dot: this.DOM.dot
        ? this.DOM.dot.getBoundingClientRect()
        : { top: 0, left: 0 },
      custom: this.DOM.custom
        ? this.DOM.custom.getBoundingClientRect()
        : { top: 0, left: 0 },
      circle: this.DOM.circle
        ? this.DOM.circle.getBoundingClientRect()
        : { top: 0, left: 0 },
    };

    this.initEvents();
    this.$raf = requestAnimationFrame(() => this.render());
  }

  initEvents(add = true) {
    this._mouseMove = (ev, iframe = null) => {
      this.mousePos = getMousePos(ev, iframe);
    };

    window.removeEventListener("mousemove", this._mouseMove, false);
    if (add) {
      window.addEventListener("mousemove", this._mouseMove, false);
      this.bindIframes();
    } else {
      this.unbindIframes();
    }
  }

  configureIframe(iframe) {
    const mustStayInteractive =
      iframe.dataset.cursorIframeInteractive === "true" ||
      isIframeSameOrigin(iframe);

    if (mustStayInteractive) {
      iframe.removeAttribute("data-cursor-iframe-pass-through");
    } else {
      iframe.dataset.cursorIframePassThrough = "true";
    }

    return mustStayInteractive;
  }

  attachSameOriginBridge(iframe, onIframeMove) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.removeEventListener("mousemove", onIframeMove, false);
      doc.addEventListener("mousemove", onIframeMove, false);
    } catch {
      // Cross-origin iframe.
    }
  }

  detachSameOriginBridge(iframe, onIframeMove) {
    try {
      iframe.contentDocument?.removeEventListener(
        "mousemove",
        onIframeMove,
        false,
      );
    } catch {
      // Cross-origin iframe.
    }
  }

  bindIframes() {
    this._iframeBindings = this._iframeBindings || new Map();

    const bind = (iframe) => {
      if (this._iframeBindings.has(iframe)) return;

      const onIframeMove = (ev) => {
        this._mouseMove(ev, iframe);
      };

      const onLoad = () => {
        const sameOrigin = this.configureIframe(iframe);
        this.detachSameOriginBridge(iframe, onIframeMove);
        if (sameOrigin) {
          this.attachSameOriginBridge(iframe, onIframeMove);
        }
      };

      onLoad();
      iframe.addEventListener("load", onLoad, false);

      this._iframeBindings.set(iframe, { onIframeMove, onLoad });
    };

    for (const iframe of document.querySelectorAll("iframe")) {
      bind(iframe);
    }

    this._iframeObserver?.disconnect();
    this._iframeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === "IFRAME") bind(node);
          node.querySelectorAll?.("iframe").forEach(bind);
        }
      }
    });
    this._iframeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  unbindIframes() {
    this._iframeObserver?.disconnect();
    this._iframeObserver = null;

    if (!this._iframeBindings) return;

    for (const [iframe, { onIframeMove, onLoad }] of this._iframeBindings) {
      iframe.removeEventListener("load", onLoad, false);
      this.detachSameOriginBridge(iframe, onIframeMove);
      iframe.removeAttribute("data-cursor-iframe-pass-through");
    }

    this._iframeBindings.clear();
  }

  render() {
    this.$raf = requestAnimationFrame(() => this.render());

    const {
      lerps: { dot, circle, custom },
      scale: { ratio },
      opacity,
    } = this.$options;

    this.lastScale = lerp(this.lastScale, this.scale, ratio);
    this.lastOpacity = lerp(this.lastOpacity, this.opacity, opacity);

    if (this.bounds.dot) {
      this.lastMousePos.dot.x = lerp(
        this.lastMousePos.dot.x,
        this.mousePos.x - this.bounds.dot.width / 2,
        dot,
      );
      this.lastMousePos.dot.y = lerp(
        this.lastMousePos.dot.y,
        this.mousePos.y - this.bounds.dot.height / 2,
        dot,
      );
      this.DOM.dot.style.transform = `translate3d(${this.lastMousePos.dot.x}px, ${this.lastMousePos.dot.y}px, 0)`;
    }

    if (this.bounds.circle) {
      this.lastMousePos.circle.x = lerp(
        this.lastMousePos.circle.x,
        this.mousePos.x - this.bounds.circle.width / 2,
        circle,
      );
      this.lastMousePos.circle.y = lerp(
        this.lastMousePos.circle.y,
        this.mousePos.y - this.bounds.circle.height / 2,
        circle,
      );
      this.DOM.circle.style.transform = `translate3d(${this.lastMousePos.circle.x}px, ${this.lastMousePos.circle.y}px, 0) scale(${this.lastScale})`;
    }

    if (this.bounds.custom) {
      this.lastMousePos.custom.x = lerp(
        this.lastMousePos.custom.x,
        this.mousePos.x - this.bounds.custom.width / 2,
        custom,
      );
      this.lastMousePos.custom.y = lerp(
        this.lastMousePos.custom.y,
        this.mousePos.y - this.bounds.custom.height / 2,
        custom,
      );
      this.DOM.custom.style.transform = `translate3d(${this.lastMousePos.custom.x}px, ${this.lastMousePos.custom.y}px, 0) scale(${this.lastScale})`;
    }
  }

  exportState() {
    if (!this.DOM) return null;

    const copyPoint = (point) => ({
      x: point?.x ?? 0,
      y: point?.y ?? 0,
    });

    return {
      mousePos: copyPoint(this.mousePos),
      lastMousePos: {
        dot: copyPoint(this.lastMousePos.dot),
        circle: copyPoint(this.lastMousePos.circle),
        custom: copyPoint(this.lastMousePos.custom),
      },
      scale: this.scale,
      lastScale: this.lastScale,
      opacity: this.opacity,
      lastOpacity: this.lastOpacity,
      visibility: this.DOM.el.style.visibility || "",
      mixBlendMode: this.DOM.el.style.mixBlendMode || "",
    };
  }

  importState(state) {
    if (!state || !this.DOM) return;

    this.mousePos = { ...state.mousePos };
    this.lastMousePos = {
      dot: { ...state.lastMousePos.dot },
      circle: { ...state.lastMousePos.circle },
      custom: { ...state.lastMousePos.custom },
    };
    this.scale = state.scale ?? this.$options.scale.min;
    this.lastScale = state.lastScale ?? this.lastScale;
    this.opacity = state.opacity ?? this.$options.opacity;
    this.lastOpacity = state.lastOpacity ?? this.lastOpacity;

    if (state.visibility) {
      this.DOM.el.style.visibility = state.visibility;
    } else {
      this.DOM.el.style.visibility = "";
    }

    this.mixBlendMode(state.mixBlendMode || null);

    if (this.bounds.dot) {
      this.DOM.dot.style.transform = `translate3d(${this.lastMousePos.dot.x}px, ${this.lastMousePos.dot.y}px, 0)`;
    }

    if (this.bounds.circle) {
      this.DOM.circle.style.transform = `translate3d(${this.lastMousePos.circle.x}px, ${this.lastMousePos.circle.y}px, 0) scale(${this.lastScale})`;
    }

    if (this.bounds.custom) {
      this.DOM.custom.style.transform = `translate3d(${this.lastMousePos.custom.x}px, ${this.lastMousePos.custom.y}px, 0) scale(${this.lastScale})`;
    }
  }

  destroy() {
    if (this.$raf) cancelAnimationFrame(this.$raf);
    this.initEvents(false);
    this.DOM = null;
  }

  enter(scale = this.$options.scale.max) {
    this.scale = scale;
  }

  leave(scale = this.$options.scale.min) {
    this.scale = scale;
  }

  click(scale = this.$options.scale.min, opacity = 0) {
    this.lastScale = scale;
    this.lastOpacity = opacity;
  }

  enterHidden() {
    if (!this.DOM) return;
    this.DOM.el.style.visibility = "hidden";
  }

  leaveHidden() {
    if (!this.DOM) return;
    this.DOM.el.style.visibility = "visible";
  }

  mixBlendMode(value = this.$options.mixBlendMode) {
    if (!this.DOM) return;
    this.DOM.el.style.mixBlendMode = value || null;
  }
}
