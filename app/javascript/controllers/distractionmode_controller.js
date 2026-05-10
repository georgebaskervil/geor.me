import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="distractionmode"
export default class extends Controller {
  static targets = ["window", "video"];

  // Keep track of windows and visibility state.
  initialize() {
    this.floatingWindows = [...this.element.querySelectorAll(".window98")];
    this.areWindowsVisible = false;
    this.hasShownBefore = false;
  }

  connect() {
    console.log("Distractionmode controller connected");
    console.log("Found window targets:", this.windowTargets.length);
    console.log("Found floating windows:", this.floatingWindows.length);

    // Set initial z-index for each window.
    for (const [index, w] of this.windowTargets.entries()) {
      w.style.zIndex = index + 1;
    }

    // Configure floating windows for transitions and set fixed positions.
    // Positions are arranged to not overlap and keep top-right clear for the distraction mode button
    const fixedPositions = [
      { left: 20, top: 100 },   // Window 1: top-left
      { left: 20, top: 460 },   // Window 2: middle-left (taller window)
      { left: 340, top: 100 },  // Window 3: top-middle
      { left: 340, top: 460 },  // Window 4: middle-middle
      { left: 660, top: 180 },  // Window 5: right side, below header
      { left: 660, top: 520 },  // Window 6: bottom-right (wide window)
    ];
    for (const [index, fw] of this.floatingWindows.entries()) {
      fw.style.transition =
        "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), left 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-in-out";
      fw.style.opacity = "0";
      // Set fixed position
      const pos = fixedPositions[index] || { left: 20, top: 100 };
      fw.style.left = `${pos.left}px`;
      fw.style.top = `${pos.top}px`;
    }

  }

  // Toggle showing/hiding all windows and playing/pausing videos.
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
        setTimeout(() => (w.style.display = "none"), 300);
      }
    }

    if (this.areWindowsVisible) this.hasShownBefore = true;

    for (const video of this.videoTargets) {
      if (this.areWindowsVisible) {
        video
          .play()
          .catch(() => {
            // Suppress play request interruption errors (browser autoplay policy)
          });
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

}
