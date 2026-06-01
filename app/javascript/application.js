import "./geor_me_extension_handoff";
import * as Sentry from "@sentry/browser";
import { shouldPerformTransition } from "./turbo_view_transitions";

// Core CSS is loaded via vite_stylesheet_tag in the layout (not bundled here).

// Blur overlay during navigation when View Transitions API is unavailable.
document.addEventListener("turbo:visit", () => {
  if (!shouldPerformTransition()) {
    document.body.classList.add("turbo-loading");
  }
});
document.addEventListener("turbo:load", () => {
  document.body.classList.remove("turbo-loading");
});

if (!import.meta.env.DEV) {
  // Only initialize Sentry when not in development mode
  Sentry.init({
    dsn: "https://9037f39780e6400bac586d00e38790dc@app.glitchtip.com/12062",

    // GDPR-friendly configuration - minimal data collection
    beforeSend(event) {
      // Remove IP addresses and user info
      delete event.user;
      delete event.request?.headers;
      delete event.request?.cookies;

      // Remove potentially sensitive data from stack traces
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.stacktrace?.frames) {
            for (const frame of exception.stacktrace.frames) {
              // Keep filename and line numbers for debugging, remove absolute paths
              if (frame.filename) {
                frame.filename =
                  frame.filename.split("/").pop() || frame.filename;
              }
              // Remove local variables that might contain sensitive data
              delete frame.vars;
            }
          }
        }
      }

      return event;
    },

    // Disable performance monitoring
    tracesSampleRate: 0,

    // Only capture errors, not performance data
    enableTracing: false,

    // Limit data collection
    maxBreadcrumbs: 5,

    // Don't capture console logs
    captureConsole: false,

    // Environment info (keep this for debugging context)
    environment: "production",
  });
}

import { createSuperHover } from "./vendor/superhover.js";

if (globalThis.matchMedia("(hover: hover)").matches) {
  createSuperHover({ selector: "*", moveEventType: false });
}

import "@hotwired/turbo-rails";
import "./turbo_view_transitions";
import "./controllers";
import "./live_updater";
import { registerServiceWorker } from "./register_service_worker";

registerServiceWorker();
