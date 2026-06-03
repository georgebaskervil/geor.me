import { Controller } from "@hotwired/stimulus";
import Hls from "hls.js";

export default class extends Controller {
  connect() {
    if (!this.element) return;

    const videoElement = this.element;
    videoElement.muted = true;
    videoElement.defaultMuted = true;
    const container = videoElement.closest(".floating-window");
    const source = videoElement.dataset.streamUrl;

    if (!source) {
      console.error("No stream URL found for video element:", videoElement.id);
      return;
    }

    this.isCarouselVideo = !container;

    // Carousel videos: init/destroy with visibility; DOM unmount also disconnects.
    if (this.isCarouselVideo) {
      this.visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (!this.hls && !videoElement.src) {
                this.initializeHLS(videoElement, undefined, source);
              } else {
                videoElement.play().catch(() => {});
              }
            } else {
              this.destroyHLS();
            }
          }
        },
        { threshold: 0.05 },
      );
      this.visibilityObserver.observe(videoElement);
      return;
    }

    if (container.style.display !== "none") {
      this.initializeHLS(videoElement, container, source);
      return;
    }

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
    if (container && container.style.display === "none") return;
    if (this.hls) return;

    if (Hls.isSupported()) {
      const hlsOptions = {
        enableWorker: true,
        progressive: true,
        startLevel: -1,
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.1,
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
              this.hls = undefined;
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

  destroyHLS() {
    this.element.pause?.();
    if (this.hls) {
      this.hls.destroy();
      this.hls = undefined;
    }
    if (this.isCarouselVideo && this.element.src) {
      this.element.removeAttribute("src");
      this.element.load();
    }
  }

  disconnect() {
    this.visibilityObserver?.disconnect();
    this.destroyHLS();
  }
}
