import { Controller } from "@hotwired/stimulus";

const WINDOW_TRANSITION =
  "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), left 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-in-out";

const WINDOW_Z_BASE = 1;
const WINDOW_Z_MAX = 6;

const INITIAL_POSITIONS = [
  { left: 20, top: 100 },
  { left: 20, top: 460 },
  { left: 340, top: 100 },
  { left: 340, top: 460 },
  { left: 660, top: 180 },
  { left: 660, top: 520 },
];

// Connects to data-controller="distractionmode"
export default class extends Controller {
  static targets = ["window", "video"];

  initialize() {
    this.areWindowsVisible = false;
    this.hasShownBefore = false;
    this.highestZIndex = WINDOW_Z_BASE;
    this.currentlyDragging = null;
    this.dragHandle = null;
    this.dragPointerId = null;
    this.dragOriginLeft = 0;
    this.dragOriginTop = 0;
    this.dragStartClientX = 0;
    this.dragStartClientY = 0;
    this.lastPointerX = 0;
    this.animationFrameId = null;
    this.pendingMove = null;
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onTitleBarDragStart = this.onTitleBarDragStart.bind(this);
    this.adjustWindowPositions = this.adjustWindowPositions.bind(this);
  }

  connect() {
    for (const [index, fw] of this.windowTargets.entries()) {
      const windowZ = WINDOW_Z_BASE + index;
      this.highestZIndex = Math.max(this.highestZIndex, windowZ);
      fw.style.zIndex = String(windowZ);
      fw.style.transition = WINDOW_TRANSITION;
      fw.style.opacity = "0";
      const pos = INITIAL_POSITIONS[index] || INITIAL_POSITIONS[0];
      this.setWindowPosition(fw, pos.left, pos.top);

      fw.addEventListener("pointerdown", this.bringWindowToFront);

      const titleBar = fw.querySelector(".title-bar");
      if (titleBar) {
        titleBar.addEventListener("pointerdown", this.onTitleBarDragStart);
      }
    }

    window.addEventListener("resize", this.adjustWindowPositions);
  }

  disconnect() {
    window.removeEventListener("resize", this.adjustWindowPositions);
    document.removeEventListener("pointermove", this.onPointerMove, true);
    document.removeEventListener("pointerup", this.onPointerUp, true);
    document.removeEventListener("pointercancel", this.onPointerUp, true);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    for (const fw of this.windowTargets) {
      fw.removeEventListener("pointerdown", this.bringWindowToFront);
      const titleBar = fw.querySelector(".title-bar");
      if (titleBar) {
        titleBar.removeEventListener("pointerdown", this.onTitleBarDragStart);
      }
    }

    document.body.classList.remove("dragging");
    this.endDrag();
  }

  setWindowPosition(fw, left, top) {
    fw.style.left = `${left}px`;
    fw.style.top = `${top}px`;
  }

  relayPointerToOverlays(clientX, clientY) {
    const detail = { bubbles: true, cancelable: true, clientX, clientY };
    window.dispatchEvent(new MouseEvent("mousemove", detail));
    document.dispatchEvent(new MouseEvent("mousemove", detail));
  }

  bringWindowToFront = (event) => {
    const fw = event.currentTarget.closest(".window98");
    if (!fw) return;
    this.highestZIndex = Math.min(WINDOW_Z_MAX, this.highestZIndex + 1);
    fw.style.zIndex = String(this.highestZIndex);
  };

  toggleDistractionMode = () => {
    this.areWindowsVisible = !this.areWindowsVisible;

    for (const w of this.windowTargets) {
      if (this.areWindowsVisible) {
        w.style.display = "block";
        setTimeout(() => {
          w.style.opacity = "1";
        }, 50);
      } else {
        w.style.opacity = "0";
        setTimeout(() => {
          w.style.display = "none";
        }, 300);
      }
    }

    if (this.areWindowsVisible) {
      this.hasShownBefore = true;
    }

    for (const video of this.videoTargets) {
      if (this.areWindowsVisible) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    this.element.dispatchEvent(
      new CustomEvent("distractionmode:toggle", {
        detail: { enabled: this.areWindowsVisible },
        bubbles: true,
      }),
    );
  };

  onTitleBarDragStart(event) {
    if (event.button !== 0 || this.currentlyDragging) return;

    const fw = event.currentTarget.closest(".window98");
    if (!fw) return;

    event.preventDefault();
    event.stopPropagation();

    this.dragHandle = event.currentTarget;
    document.body.classList.add("dragging");
    fw.classList.add("currently-dragging");
    this.currentlyDragging = fw;

    const rect = fw.getBoundingClientRect();
    this.dragOriginLeft = rect.left;
    this.dragOriginTop = rect.top;
    this.dragStartClientX = event.clientX;
    this.dragStartClientY = event.clientY;
    this.lastPointerX = event.clientX;
    this.highestZIndex = Math.min(WINDOW_Z_MAX, this.highestZIndex + 1);
    fw.style.zIndex = String(this.highestZIndex);
    fw.style.transition = "none";

    this.dragPointerId = event.pointerId;
    try {
      this.dragHandle.setPointerCapture(event.pointerId);
    } catch {
      // Ignore if capture is unavailable.
    }

    this.relayPointerToOverlays(event.clientX, event.clientY);

    document.addEventListener("pointermove", this.onPointerMove, true);
    document.addEventListener("pointerup", this.onPointerUp, true);
    document.addEventListener("pointercancel", this.onPointerUp, true);
  }

  onPointerMove(event) {
    if (!this.currentlyDragging) return;

    this.relayPointerToOverlays(event.clientX, event.clientY);

    this.pendingMove = { clientX: event.clientX, clientY: event.clientY };
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(() => this.updatePosition());
    }
  }

  updatePosition() {
    this.animationFrameId = null;
    if (!this.pendingMove || !this.currentlyDragging) return;

    const { clientX, clientY } = this.pendingMove;
    const fw = this.currentlyDragging;
    const deltaX = clientX - this.dragStartClientX;
    const deltaY = clientY - this.dragStartClientY;
    let newLeft = this.dragOriginLeft + deltaX;
    let newTop = this.dragOriginTop + deltaY;

    const minLeft = 10;
    const minTop = 10;
    const maxLeft = window.innerWidth - fw.offsetWidth - 10;
    const maxTop = window.innerHeight - fw.offsetHeight - 10;
    newLeft = this.clamp(newLeft, minLeft, maxLeft);
    newTop = this.clamp(newTop, minTop, maxTop);

    const frameDeltaX = clientX - this.lastPointerX;
    const rotationDeg = frameDeltaX * 0.5;
    const radians = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    this.setWindowPosition(fw, newLeft, newTop);
    fw.style.transform = `matrix3d(${cos}, ${sin}, 0, 0, ${-sin}, ${cos}, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)`;

    this.lastPointerX = clientX;
    this.pendingMove = null;
  }

  onPointerUp() {
    this.endDrag();
  }

  endDrag() {
    document.removeEventListener("pointermove", this.onPointerMove, true);
    document.removeEventListener("pointerup", this.onPointerUp, true);
    document.removeEventListener("pointercancel", this.onPointerUp, true);

    if (this.dragHandle && this.dragPointerId != null) {
      try {
        this.dragHandle.releasePointerCapture(this.dragPointerId);
      } catch {
        // Ignore if capture was not held.
      }
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.pendingMove = null;
    this.dragHandle = null;
    this.dragPointerId = null;

    if (!this.currentlyDragging) return;

    const fw = this.currentlyDragging;
    document.body.classList.remove("dragging");
    fw.classList.remove("currently-dragging");
    fw.style.transform = "";
    fw.style.transition = WINDOW_TRANSITION;
    this.currentlyDragging = null;
  }

  adjustWindowPositions() {
    for (const fw of this.windowTargets) {
      const maxLeft = window.innerWidth - fw.offsetWidth - 10;
      const maxTop = window.innerHeight - fw.offsetHeight - 10;
      const currentLeft = Number.parseInt(fw.style.left, 10) || 10;
      const currentTop = Number.parseInt(fw.style.top, 10) || 10;
      let left = currentLeft;
      let top = currentTop;
      if (left > maxLeft) left = maxLeft;
      if (top > maxTop) top = maxTop;
      this.setWindowPosition(fw, left, top);
    }
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }
}
