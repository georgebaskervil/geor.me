/**
 * Registers the Workbox service worker at /service-worker.js (copied from public/vite
 * after vite:build). Disabled in development and when the browser has no SW support.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  });
}
