/**
 * Live stats via Action Cable (Iodine WebSocket). JSON polling only if the socket fails.
 */

import { createConsumer } from "@rails/actioncable";

const LIVE_URL = "/api/v1/stats/live";
const FALLBACK_INTERVAL_MS = 60_000;

function timeSinceText(timeSince) {
  return `${timeSince.years} years, ${timeSince.months} months, and ${timeSince.days} days`;
}

function applySnapshot(snapshot) {
  if (!snapshot) return;

  for (const element of document.querySelectorAll("[data-live-time-since]")) {
    const text = timeSinceText(snapshot.time_since);
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  for (const element of document.querySelectorAll("[data-live-current-day]")) {
    const day = snapshot.current_day;
    if (element.textContent !== day) {
      element.textContent = day;
    }
  }
}

class LiveStatsCable {
  constructor() {
    this.consumer = null;
    this.subscription = null;
    this.fallbackTimer = null;
    this.paused = false;
    this.usingFallback = false;
    this.intentionalDisconnect = false;
  }

  targetsPresent() {
    return (
      document.querySelector("[data-live-time-since]") ||
      document.querySelector("[data-live-current-day]")
    );
  }

  start() {
    if (!this.targetsPresent()) return;
    this.stopFallback();
    this.paused = false;

    if (this.subscription) return;

    if (typeof createConsumer !== "function") {
      this.startFallback();
      return;
    }

    this.connectCable();
  }

  connectCable() {
    try {
      this.consumer = createConsumer();
      this.subscription = this.consumer.subscriptions.create(
        { channel: "LiveStatsChannel" },
        {
          connected: () => {
            this.stopFallback();
          },
          received: (snapshot) => {
            applySnapshot(snapshot);
          },
          disconnected: () => {
            if (this.paused || this.intentionalDisconnect) return;
            this.startFallback();
          },
        },
      );
    } catch (error) {
      console.warn("LiveStatsCable:", error);
      this.startFallback();
    }
  }

  startFallback() {
    if (this.usingFallback) return;
    this.usingFallback = true;
    this.disconnectCable();

    const poll = async () => {
      try {
        const response = await fetch(LIVE_URL, {
          headers: { Accept: "application/json" },
          cache: "no-cache",
        });
        if (!response.ok) {
          throw new Error(`Live stats fetch failed (${response.status})`);
        }
        applySnapshot(await response.json());
      } catch (error) {
        console.warn("LiveStatsCable fallback:", error);
      }
    };

    poll();
    this.fallbackTimer = setInterval(poll, FALLBACK_INTERVAL_MS);
  }

  stopFallback() {
    this.usingFallback = false;
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  disconnectCable() {
    this.intentionalDisconnect = true;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.consumer?.disconnect();
    this.consumer = null;
    this.intentionalDisconnect = false;
  }

  pause() {
    this.paused = true;
    this.stopFallback();
    this.disconnectCable();
  }

  resume() {
    if (this.paused && this.targetsPresent()) {
      this.paused = false;
      this.start();
    }
  }

  stop() {
    this.stopFallback();
    this.disconnectCable();
  }
}

let liveStatsCable;

function initLiveStats() {
  if (!document.querySelector("[data-live-time-since], [data-live-current-day]")) {
    liveStatsCable?.stop();
    liveStatsCable = null;
    return;
  }

  liveStatsCable ??= new LiveStatsCable();
  liveStatsCable.start();
}

function bindLiveStatsLifecycle() {
  document.addEventListener("visibilitychange", () => {
    if (!liveStatsCable) return;
    if (document.hidden) {
      liveStatsCable.pause();
    } else {
      liveStatsCable.resume();
    }
  });

  document.addEventListener("turbo:before-visit", () => {
    liveStatsCable?.pause();
  });

  document.addEventListener("turbo:load", initLiveStats);
}

bindLiveStatsLifecycle();
initLiveStats();

export class LiveUpdater {
  constructor(options) {
    console.warn(
      "LiveUpdater is deprecated; live stats use Action Cable via LiveStatsCable.",
      options,
    );
  }
}
