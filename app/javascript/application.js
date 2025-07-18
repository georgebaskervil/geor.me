import * as Sentry from "@sentry/browser";

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
                frame.filename = frame.filename.split('/').pop() || frame.filename;
              }
              // Remove local variables that might contain sensitive data
              delete frame.vars;
            }
          }
        }
      }
      
      return event;
    },
    
    // Disable automatic breadcrumbs that might collect personal data
    integrations: [
      new Sentry.BrowserTracing({
        // Disable automatic route tracking
        routingInstrumentation: false,
      }),
    ],
    
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

// Hijack the XMLHttpRequest primitive to replace the wdosbox.js and wdosbox.wasm URLs
// Its a hack, but I can't find a way to control what other libraries are doing
// without going in and modifying them directly
import wdosboxJsUrl from "emulators/dist/wdosbox.js?url";
import wdosboxWasmUrl from "emulators/dist/wdosbox.wasm?url";

(function () {
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (url.includes("wdosbox.js")) url = wdosboxJsUrl;
    if (url.includes("wdosbox.wasm")) url = wdosboxWasmUrl;
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (resource, ...rest) {
    if (typeof resource === "string") {
      if (resource.includes("wdosbox.js")) resource = wdosboxJsUrl;
      if (resource.includes("wdosbox.wasm")) resource = wdosboxWasmUrl;
    }
    return originalFetch(resource, ...rest);
  };
})();

import "@hotwired/turbo-rails";
import "./controllers";
import "./live_updater";
