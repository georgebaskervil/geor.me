/**
 * LiveUpdater - A reusable system for automatically updating dynamic content
 *
 * Usage:
 * new LiveUpdater({
 *   endpoint: '/api/v1/stats/request_count',
 *   selector: '[data-live-counter]',
 *   interval: 5000,
 *   transform: (data) => data.count.toLocaleString()
 * });
 */
export class LiveUpdater {
  constructor(options) {
    this.endpoint = options.endpoint;
    this.selector = options.selector;
    this.interval = options.interval || 10_000; // Default 10 seconds
    this.transform = options.transform || ((data) => data);
    this.retryDelay = options.retryDelay || 30_000; // Retry after 30s on error
    this.maxRetries = options.maxRetries || 3;

    this.elements = document.querySelectorAll(this.selector);
    this.isRunning = false;
    this.retryCount = 0;
    this.timeoutId = undefined;

    // Only start if elements exist on the page
    if (this.elements.length > 0) {
      this.start();

      // Stop updating when page becomes hidden to save resources
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });
    }
  }

  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.scheduleUpdate();
  }

  pause() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  resume() {
    if (!this.isRunning && this.elements.length > 0) {
      this.start();
    }
  }

  stop() {
    this.pause();
    this.elements = [];
  }

  scheduleUpdate() {
    if (!this.isRunning) return;

    this.timeoutId = setTimeout(() => {
      this.update();
    }, this.interval);
  }

  async update() {
    if (!this.isRunning) return;

    try {
      const response = await fetch(this.endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        // Add cache busting to ensure fresh data
        cache: "no-cache",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const transformedData = this.transform(data);

      // Update all matching elements
      for (const element of this.elements) {
        if (element.textContent !== transformedData.toString()) {
          element.textContent = transformedData;

          // Add a subtle flash animation to indicate update
          element.style.transition = "color 0.3s ease";
          element.style.color = "#10b981"; // green flash
          setTimeout(() => {
            element.style.color = "";
          }, 300);
        }
      }

      // Reset retry count on success
      this.retryCount = 0;

      // Schedule next update
      this.scheduleUpdate();
    } catch (error) {
      console.warn(`LiveUpdater failed to fetch from ${this.endpoint}:`, error);

      this.retryCount++;

      if (this.retryCount <= this.maxRetries) {
        // Retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        console.log(
          `Retrying in ${delay / 1000}s (attempt ${this.retryCount}/${this.maxRetries})`,
        );

        this.timeoutId = setTimeout(() => {
          this.update();
        }, delay);
      } else {
        console.error(`LiveUpdater gave up after ${this.maxRetries} retries`);
        // Still schedule regular updates in case the network recovers
        this.retryCount = 0;
        this.scheduleUpdate();
      }
    }
  }
}

// Auto-initialize common live updaters when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Request counter updater
  new LiveUpdater({
    endpoint: "/api/v1/stats/request_count",
    selector: "[data-live-request-count]",
    interval: 5000, // Update every 5 seconds
    transform: (data) => data.count.toLocaleString(),
  });

  // Time since counter updater
  new LiveUpdater({
    endpoint: "/api/v1/stats/time_since",
    selector: "[data-live-time-since]",
    interval: 60_000, // Update every minute
    transform: (data) =>
      `${data.years} years, ${data.months} months, and ${data.days} days`,
  });

  // Current day updater for footer
  new LiveUpdater({
    endpoint: "/api/v1/stats/current_day",
    selector: "[data-live-current-day]",
    interval: 300_000, // Update every 5 minutes (day doesn't change often)
    transform: (data) => data.day,
  });
});
