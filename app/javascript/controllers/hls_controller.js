import { Controller } from "@hotwired/stimulus";
import Hls from "hls.js";

export default class extends Controller {
  connect() {
    if (!this.element) return;

    const videoElement = this.element;
    const container = videoElement.closest(".floating-window");
    const source = videoElement.dataset.streamUrl; // Get from data attribute

    if (!source) {
      console.error("No stream URL found for video element:", videoElement.id);
      return;
    }

    // Check if this is a carousel video (no floating window container)
    if (!container) {
      // For carousel videos, initialize immediately
      this.initializeHLS(videoElement, undefined, source);
      return;
    }

    // For floating window videos, check visibility
    if (container.style.display !== "none") {
      this.initializeHLS(videoElement, container, source);
      return;
    }

    // Wait for the container to become visible before initializing HLS
    const observer = new MutationObserver((mutations, obs) => {
      if (container.style.display !== "none") {
        this.initializeHLS(videoElement, container, source);
        obs.disconnect();
      }
    });

    observer.observe(container, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  initializeHLS(videoElement, container, source) {
    // Skip visibility check for carousel videos (container is null)
    if (container && container.style.display === "none") return;

    if (Hls.isSupported()) {
      const hlsOptions = {
        enableWorker: true,
        progressive: true,
        startLevel: -1,
        maxBufferLength: 30, // seconds
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.1, // seconds
        lowLatencyMode: true,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        abrEwmaFastLive: 3,
        abrEwmaSlowLive: 9,
        abrEwmaFastVoD: 3,
        abrEwmaSlowVoD: 9,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        fragLoadingTimeOut: 20_000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingTimeOut: 30_000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 20_000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
      };

      const hls = new Hls(hlsOptions);
      hls.loadSource(source);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // For carousel videos (no container), always try to play
        // For floating window videos, check container visibility
        if (!container || container.style.display !== "none") {
          videoElement.play().catch((error) => {
            if (error.name === "NotAllowedError") {
              console.info("Autoplay blocked - waiting for user interaction");
            } else {
              console.warn("Play request failed:", error);
            }
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              console.error("Network error, attempting to recover...");
              hls.startLoad();
              break;
            }
            case Hls.ErrorTypes.MEDIA_ERROR: {
              console.error("Media error, attempting to recover...");
              hls.recoverMediaError();
              break;
            }
            default: {
              console.error("Fatal error, destroying HLS instance:", data);
              hls.destroy();
              break;
            }
          }
        }
      });

      this.hls = hls;
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = source;
    } else {
      console.error("HLS is not supported in this browser");
    }
  }

  disconnect() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = undefined;
    }
  }
}
