import path from "node:path";
import { fileURLToPath } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Same-origin static assets not emitted by the Vite build (vendor/, RobusText, fonts). */
function isPublicStaticAsset(request, url) {
  if (request.method !== "GET") return false;
  if (request.destination === "document") return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/cable")) return false;

  const { destination } = request;
  if (
    destination === "script" ||
    destination === "style" ||
    destination === "font" ||
    destination === "worker"
  ) {
    return true;
  }

  if (destination === "image") return true;

  if (url.pathname.startsWith("/vendor/")) return true;
  if (/^\/RobusText\.(js|wasm|data)$/i.test(url.pathname)) return true;
  if (/^\/robustext-embed\.html$/i.test(url.pathname)) return true;
  if (/\.(woff2?|wasm|js|css|svg|png|jpe?g|webp|avif|gif)$/i.test(url.pathname)) {
    return true;
  }

  return false;
}

const PRECACHE_MAX_BYTES = 2 * 1024 * 1024;

export function createPwaPlugin() {
  return VitePWA({
    registerType: "autoUpdate",
    injectRegister: false,
    manifest: false,
    includeAssets: [],
    filename: "service-worker.js",
    scope: "/",
    // Warn on oversize precache entries instead of failing the build (photos, neudec chunk).
    showMaximumFileSizeToCacheInBytesWarning: true,
    workbox: {
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      skipWaiting: true,
      clientsClaim: true,
      globDirectory: path.join(projectRoot, "public/vite"),
      globPatterns: ["**/*.{js,css,woff2,woff,ttf}"],
      globIgnores: [
        "**/*-legacy-*.js",
        "**/*.map",
        "**/*.{png,jpg,jpeg,gif,webp,avif,JPG,JPEG,PNG}",
      ],
      maximumFileSizeToCacheInBytes: PRECACHE_MAX_BYTES,
      manifestTransforms: [
        async (manifestEntries) => ({
          manifest: manifestEntries.filter(({ url, size }) => {
            if (!/\.(js|css|woff2?|ttf)$/i.test(url)) return false;
            if (typeof size === "number" && size > PRECACHE_MAX_BYTES) return false;
            return true;
          }),
          warnings: [],
        }),
      ],
      runtimeCaching: [
        {
          urlPattern: ({ request, url }) => isPublicStaticAsset(request, url),
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "geor-public-static",
            expiration: {
              maxEntries: 48,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
    },
  });
}
