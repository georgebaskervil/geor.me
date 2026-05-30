<template>
  <div
    v-show="loaded"
    ref="cursor"
    id="cursor-fx"
    class="cursor-fx"
    :class="classes"
    :style="cssVars"
  >
    <div
      v-show="!hideOutside"
      class="cursor-fx__inner cursor-fx__inner__outside"
      :style="outsideSizes"
    />
    <div
      v-show="forceCustomSlot"
      class="cursor-fx__inner cursor-fx__inner__custom"
      :style="outsideSizes"
    />
    <div
      v-show="!hideInside"
      class="cursor-fx__inner cursor-fx__inner__inside"
      :style="insideSizes"
    />
  </div>
</template>

<script>
import CursorFx from "../vendor/cursor-fx.js";

const ACCENT = "#B0A2C6";
const CURSOR_STORAGE_KEY = "cursor-fx-state";

export default {
  name: "CursorFxWrapper",
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: ACCENT,
    },
    colorHover: {
      type: String,
      default: ACCENT,
    },
    delay: {
      type: [Number, String],
      default: 60,
    },
    allowOnMobile: {
      type: Boolean,
      default: false,
    },
    hideOutside: {
      type: Boolean,
      default: false,
    },
    hideInside: {
      type: Boolean,
      default: false,
    },
    forceCustomSlot: {
      type: Boolean,
      default: false,
    },
    shape: {
      type: String,
      default: null,
    },
    mixBlendMode: {
      type: String,
      default: null,
    },
    config: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      destroyed: true,
      touch: false,
      hover: false,
      loaded: false,
      timeoutId: null,
      cursor: null,
    };
  },
  computed: {
    classes() {
      return {
        "cursor-fx--hover": this.hover,
        "cursor-fx--touch": this.touch,
        "cursor-fx--loaded": this.loaded,
        [`cursor-fx--shape-${this.shape}`]: Boolean(this.shape),
      };
    },
    cssVars() {
      return {
        "--color": this.color,
        "--color-hover": this.colorHover,
        "mix-blend-mode": this.mixBlendMode,
      };
    },
    outsideSizes() {
      return {};
    },
    insideSizes() {
      return {};
    },
  },
  watch: {
    config: {
      handler: "refresh",
      deep: true,
    },
  },
  mounted() {
    if (this.disabled) return;

    this.touch = this.isTouchDevice();
    if (this.allowOnMobile || !this.touch) {
      this.start();
    }

    this.onTurboLoad = () => this.rebindPageEvents();
    this.saveCursorState = () => this.persistCursorState();
    document.addEventListener("turbo:load", this.onTurboLoad);
    document.addEventListener("turbo:before-visit", this.saveCursorState);
    document.addEventListener("turbo:before-cache", this.saveCursorState);
    window.addEventListener("pagehide", this.saveCursorState);
  },
  beforeUnmount() {
    this.persistCursorState();
    document.removeEventListener("turbo:load", this.onTurboLoad);
    document.removeEventListener("turbo:before-visit", this.saveCursorState);
    document.removeEventListener("turbo:before-cache", this.saveCursorState);
    window.removeEventListener("pagehide", this.saveCursorState);
    this.destroy();
  },
  methods: {
    isTouchDevice() {
      return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );
    },
    cursorHover() {
      this.hover = true;
      this.cursor?.enter();
    },
    cursorLeave() {
      this.hover = false;
      this.cursor?.leave();
    },
    cursorClick() {
      this.cursor?.click();
    },
    cursorEnterHidden() {
      this.cursor?.enterHidden();
    },
    cursorLeaveHidden() {
      this.cursor?.leaveHidden();
    },
    cursorMixBlendMode(event) {
      this.cursor?.mixBlendMode(
        event?.target?.dataset?.cursorMixBlendMode ?? null,
      );
    },
    initEvents() {
      for (const link of document.querySelectorAll("[data-cursor-hover]")) {
        link.addEventListener("mouseenter", this.cursorHover, false);
        link.addEventListener("mouseleave", this.cursorLeave, false);
        link.addEventListener("click", this.cursorClick, false);
      }

      for (const link of document.querySelectorAll("[data-cursor-hidden]")) {
        link.addEventListener("mouseenter", this.cursorEnterHidden, false);
        link.addEventListener("mouseleave", this.cursorLeaveHidden, false);
      }

      for (const link of document.querySelectorAll(
        "[data-cursor-mix-blend-mode]",
      )) {
        link.addEventListener("mouseenter", this.cursorMixBlendMode, false);
        link.addEventListener("mouseleave", this.cursorMixBlendMode, false);
      }
    },
    removeEvents() {
      for (const link of document.querySelectorAll("[data-cursor-hover]")) {
        link.removeEventListener("mouseenter", this.cursorHover, false);
        link.removeEventListener("mouseleave", this.cursorLeave, false);
        link.removeEventListener("click", this.cursorClick, false);
      }

      for (const link of document.querySelectorAll("[data-cursor-hidden]")) {
        link.removeEventListener("mouseenter", this.cursorEnterHidden, false);
        link.removeEventListener("mouseleave", this.cursorLeaveHidden, false);
      }

      for (const link of document.querySelectorAll(
        "[data-cursor-mix-blend-mode]",
      )) {
        link.removeEventListener("mouseenter", this.cursorMixBlendMode, false);
        link.removeEventListener("mouseleave", this.cursorMixBlendMode, false);
      }
    },
    init(events = true) {
      this.cursor = new CursorFx(
        {
          el: this.$refs.cursor,
          base_class: ".cursor-fx",
        },
        {
          mixBlendMode: this.mixBlendMode,
          ...this.config,
        },
      );

      this.restoreCursorState();

      if (events) this.initEvents();

      this.loaded = true;
      document.documentElement.classList.add(
        "is-cursor-fx-active",
        "cursor-fx-ready",
      );
    },
    cancelStartDelay() {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    },
    async destroy(refresh = false) {
      this.cancelStartDelay();
      document.documentElement.classList.remove(
        "is-cursor-fx-active",
        "cursor-fx-ready",
      );
      this.loaded = false;
      this.removeEvents();

      await this.$nextTick();

      this.cursor?.destroy();
      this.cursor = null;
      this.destroyed = true;

      if (refresh) this.start();
    },
    start() {
      if (!this.destroyed) return;

      this.destroyed = false;
      this.cancelStartDelay();

      this.timeoutId = window.setTimeout(
        () => this.init(),
        Number.parseInt(this.delay, 10),
      );
    },
    refresh() {
      this.destroy(true);
    },
    rebindPageEvents() {
      if (!this.cursor || !this.loaded) return;

      this.removeEvents();
      this.initEvents();
    },
    persistCursorState() {
      if (!this.cursor) return;

      const state = {
        ...this.cursor.exportState(),
        hover: this.hover,
      };

      try {
        sessionStorage.setItem(CURSOR_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore quota or privacy-mode failures.
      }
    },
    restoreCursorState() {
      try {
        const savedState = sessionStorage.getItem(CURSOR_STORAGE_KEY);
        if (!savedState) return;

        const state = JSON.parse(savedState);
        this.hover = Boolean(state.hover);
        this.cursor.importState(state);
      } catch {
        // Ignore corrupt saved state.
      }
    },
  },
};
</script>

<style>
.cursor-fx {
  opacity: 0;
  color: var(--color, #333);
  transition:
    color 0.18s ease-in-out,
    opacity 0.6s ease-in-out;
}

.cursor-fx--hover {
  color: var(--color-hover, #333);
}

.cursor-fx__inner {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  border-radius: 100%;
  transition-timing-function: ease;
  transition-duration: 0.23s;
  transition-property:
    color, width, height, background-color, border-radius, border-color;
  pointer-events: none;
  will-change: auto;
}

.cursor-fx__inner__outside {
  border: 1px solid;
  border-color: currentcolor;
}

.cursor-fx__inner__outside,
.cursor-fx__inner__custom {
  width: 64px;
  height: 64px;
}

.cursor-fx__inner__inside {
  width: 10px;
  height: 10px;
  background-color: currentcolor;
}

.cursor-fx--shape-square > .cursor-fx__inner {
  border-radius: 0;
}

html.is-cursor-fx-active.cursor-fx-ready,
html.is-cursor-fx-active.cursor-fx-ready * {
  cursor: none;
}

.is-cursor-fx-active .cursor-fx {
  transition-delay: 0.3s;
}

.is-cursor-fx-active .cursor-fx.cursor-fx--loaded {
  opacity: 1;
}
</style>
