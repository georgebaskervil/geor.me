import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="distractionmode"
export default class extends Controller {
  static targets = ["window", "video"];

  // Keep track of windows, z-index, dragging state.
  initialize() {
    this.floatingWindows = [...this.element.querySelectorAll(".window98")];
    this.areWindowsVisible = false;
    this.highestZIndex = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.hasShownBefore = false;
    this.animationFrameId = undefined;
    this.pendingMove = undefined;
  }

  connect() {
    // Set initial z-index and wire up click handlers.
    for (const [index, w] of this.windowTargets.entries()) {
      w.style.zIndex = index + 1;
      this.highestZIndex = Math.max(this.highestZIndex, index + 1);
      w.addEventListener("mousedown", () => this.bringToFront(w));
    }

    // Configure floating windows for transitions and dragging.
    for (const fw of this.floatingWindows) {
      fw.style.transition =
        "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), left 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-in-out";
      fw.style.opacity = "0";
      const dragHandle = fw.querySelector(".title-bar");
      dragHandle.addEventListener("mousedown", this.onDragStart);
    }

    // Watch window size changes to keep windows in view.
    window.addEventListener("resize", this.adjustWindowPositions);
  }

  // Toggle showing/hiding all windows and playing/pausing videos.
  toggleDistractionMode = () => {
    const firstShow = !this.hasShownBefore;
    this.areWindowsVisible = !this.areWindowsVisible;

    for (const w of this.windowTargets) {
      if (this.areWindowsVisible) {
        w.style.display = "block";
        setTimeout(() => {
          w.style.opacity = "1";
          if (firstShow) this.randomizePosition(w);
        }, 50);
      } else {
        w.style.opacity = "0";
        setTimeout(() => (w.style.display = "none"), 300);
      }
    }

    if (this.areWindowsVisible) this.hasShownBefore = true;

    for (const video of this.videoTargets) {
      if (this.areWindowsVisible) {
        video
          .play()
          .catch((error) => console.warn("Play request interrupted:", error));
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

  // Randomize a window’s position on screen.
  randomizePosition = (floatingWindow) => {
    const { offsetWidth, offsetHeight } = floatingWindow;
    const maxLeft = window.innerWidth - offsetWidth - 20;
    const maxTop = window.innerHeight - offsetHeight - 20;
    floatingWindow.style.left = `${this.randomRange(10, maxLeft)}px`;
    floatingWindow.style.top = `${this.randomRange(10, maxTop)}px`;
  };

  // Handle mouse down on a title bar.
  onDragStart = (event) => {
    const fw = event.currentTarget.closest(".window98");
    document.body.classList.add("dragging");
    fw.classList.add("currently-dragging");
    this.currentlyDragging = fw;
    const rect = fw.getBoundingClientRect();
    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.bringToFront(fw);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
    event.preventDefault();
  };

  // Track mouse movement but delay position update with requestAnimationFrame.
  onMouseMove = (event) => {
    if (this.currentlyDragging) {
      this.pendingMove = { clientX: event.clientX, clientY: event.clientY };
      if (!this.animationFrameId) {
        this.animationFrameId = requestAnimationFrame(this.updatePosition);
      }
    }
  };

  // Apply position and rotation updates during each animation frame.
  updatePosition = () => {
    if (this.pendingMove && this.currentlyDragging) {
      const { clientX, clientY } = this.pendingMove;
      const newLeft = this.clamp(
        clientX - this.offsetX,
        10,
        window.innerWidth - this.currentlyDragging.offsetWidth - 10,
      );
      const newTop = this.clamp(
        clientY - this.offsetY,
        10,
        window.innerHeight - this.currentlyDragging.offsetHeight - 10,
      );

      const deltaX = clientX - this.lastMouseX;
      const rotationDeg = deltaX * 0.5;
      const cos = Math.cos((rotationDeg * Math.PI) / 180);
      const sin = Math.sin((rotationDeg * Math.PI) / 180);

      this.currentlyDragging.style.left = `${newLeft}px`;
      this.currentlyDragging.style.top = `${newTop}px`;
      this.currentlyDragging.style.transform = `matrix3d(${cos}, ${sin}, 0, 0, ${-sin}, ${cos}, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)`;

      this.lastMouseX = clientX;
      this.lastMouseY = clientY;
      this.pendingMove = undefined;
      this.animationFrameId = undefined;
    }
  };

  // End dragging.
  onMouseUp = () => {
    if (this.currentlyDragging) {
      document.body.classList.remove("dragging");
      this.currentlyDragging.classList.remove("currently-dragging");
      this.currentlyDragging.style.transform = "rotate(0deg)";
      this.currentlyDragging = undefined;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = undefined;
      }
      this.pendingMove = undefined;
    }
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  };

  // Ensure windows stay within the viewport when resized.
  adjustWindowPositions = () => {
    for (const fw of this.floatingWindows) {
      const { offsetWidth, offsetHeight } = fw;
      const maxLeft = window.innerWidth - offsetWidth - 10;
      const maxTop = window.innerHeight - offsetHeight - 10;
      let currentLeft = Number.parseInt(fw.style.left, 10) || 10;
      let currentTop = Number.parseInt(fw.style.top, 10) || 10;
      if (currentLeft > maxLeft) fw.style.left = `${maxLeft}px`;
      if (currentTop > maxTop) fw.style.top = `${maxTop}px`;
    }
  };

  bringToFront = (fw) => {
    this.highestZIndex++;
    fw.style.zIndex = this.highestZIndex;
  };

  // Helper to clamp a value within [min, max].
  clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  // Helper to pick a random number between min and max.
  randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}
