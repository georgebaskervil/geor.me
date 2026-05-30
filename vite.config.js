import "v8-compile-cache";
import MillionLint from "@million/lint";
import { defineConfig } from "vite";
import rubyPlugin from "vite-plugin-ruby";
import fullReload from "vite-plugin-full-reload";
import stimulusHMR from "vite-plugin-stimulus-hmr";
import cssnano from "cssnano";
import tailwindcss from "tailwindcss";
import vue from "@vitejs/plugin-vue";
import babel from "vite-plugin-babel";
import postcssInlineRtl from "postcss-inline-rtl";
import postcssUrl from "postcss-url";
import postcssRemoveRoot from "postcss-remove-root";
import cssMqpacker from "css-mqpacker";
import stylehacks from "stylehacks";
import postcssMqOptimize from "postcss-mq-optimize";
import autoprefixer from "autoprefixer";
import nodePolyfills from "rollup-plugin-polyfill-node";
import vitePluginBundleObfuscator from "vite-plugin-bundle-obfuscator";
import { purgePolyfills } from "unplugin-purge-polyfills";
import replacements from "./vendor/javascript/unplugin-replacements/lib/vite.js";
import coffeescript from "./plugins/coffeescript.js";
import typehints from "./plugins/typehints.js";
import removePrefix from "./plugins/postcss-remove-prefix.js";
import postcssSuperHover from "./plugins/postcss-super-hover.js";
import {
    allObfuscatorConfig,
    commonDefine,
    createBabelOptions,
    createCommonBuild,
    createEsbuildConfig,
    createOptimizeDepsForce,
    createTypehintPlugin,
    devViteSecurityHeaders,
} from "./config/vite/common.js";
import path from "node:path";

/** Inline browserify global detection in emulators (core-js) so it cannot collide with other minified top-level bindings. */
function fixEmulatorsGlobalShimPlugin() {
  const inlinedGlobal =
    '(typeof globalThis!="undefined"?globalThis:typeof self!="undefined"?self:typeof window!="undefined"?window:{})';
  const patterns = [
    /\.call\(this,void 0!==\w+\?\w+:"undefined"!=typeof self\?self:"undefined"!=typeof window\?window:\{\}\)/g,
    /\.call\(this,"undefined"!=typeof global\?global:"undefined"!=typeof self\?self:"undefined"!=typeof window\?window:\{\}\)/g,
    /\}\("undefined"!=typeof global\?global:"undefined"!=typeof self\?self:"undefined"!=typeof window\?window:\{\}\)/g,
    /\}\("undefined"!=typeof globalThis\?globalThis:"undefined"!=typeof self\?self:"undefined"!=typeof window\?window:\{\}\)/g,
  ];

  const patch = (code) => {
    let next = code;
    for (const pattern of patterns) {
      next = next.replace(pattern, `.call(this,${inlinedGlobal})`);
    }
    return next === code ? null : next;
  };

  return {
    name: "fix-emulators-global-shim",
    transform(code, id) {
      if (!id.includes("node_modules/emulators")) return;
      const next = patch(code);
      if (!next) return;
      return { code: next, map: null };
    },
    renderChunk(code, chunk) {
      if (
        chunk.type !== "chunk" ||
        (!chunk.fileName.includes("vendor-modules") &&
          !chunk.fileName.includes("emulators"))
      ) {
        return;
      }
      const next = patch(code);
      if (!next) return;
      return { code: next, map: null };
    },
  };
}

/** Fail the build if vendor chunks contain broken `| 0` coercions from typehints/babel. */
function verifyVendorChunksPlugin() {
  const corruptPatterns = [
    /\b0\|[a-zA-Z_$][\w$]*\.get\(/,
    /Array\([^)]+\)\|0/,
    /arguments\.length-\d+\|0/,
    /\._ioInfo\|0/,
  ];

  return {
    name: "verify-vendor-chunks",
    apply: "build",
    writeBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== "chunk") continue;
        if (!fileName.includes("vue-vendor") && !fileName.includes("react-vendor")) {
          continue;
        }
        for (const pattern of corruptPatterns) {
          if (pattern.test(chunk.code)) {
            this.error(
              `Vendor chunk ${fileName} matches ${pattern} (unsafe |0 coercion). Disable typehints enableCoercions and exclude node_modules.`,
            );
          }
        }
      }
    },
  };
}

function checkBareSpecifiersPlugin() {
  const staticImportPattern = /(?:\b(?:import|export)\b[^;]{0,200}?\bfrom\s*['"]([^./][^'"]*)['"])/g;
  const dynamicImportPattern = /\bimport\(\s*['"]([^./][^'"]*)['"]\)/g;

  return {
    name: "check-bare-specifiers",
    apply: "build",
    writeBundle(_options, bundle) {
      const errors = [];
      for (const fileName of Object.keys(bundle)) {
        const chunk = bundle[fileName];
        if (chunk.type !== "chunk" || typeof chunk.code !== "string") continue;
        let match;
        while ((match = staticImportPattern.exec(chunk.code))) {
          errors.push(`${fileName}:${match.index} import from ${match[1]}`);
        }
        while ((match = dynamicImportPattern.exec(chunk.code))) {
          errors.push(`${fileName}:${match.index} dynamic import ${match[1]}`);
        }
      }
      if (errors.length > 0) {
        this.error(
          `Bare module specifiers found in generated bundles:\n${errors.slice(0, 20).join("\n")}`,
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development";

  const typehintPlugin = createTypehintPlugin(typehints);

  return {
    /** Esbuild Options */
    esbuild: createEsbuildConfig(isDevelopment),

    /** Resolve Options */
    resolve: {
      extensions: [".js", ".json", ".coffee", ".scss", ".snappy", ".es6"],
      alias: {
        "normalise.scss": "normalise.scss/normalise.scss",
      },
    },

    /** Asset Inclusion */
    assetsInclude: ["**/*.jsdos", "**/*.gguf", "**/*.wasm"],

    /** Build Options */
    build: createCommonBuild({
      isDevelopment,
      rollupInput: {
        application: "app/javascript/application.js",
      },
    }),

    /** Server Options */
    server: {
      host: process.env.VITE_DEV_SERVER_HOST || "127.0.0.1",
      port: Number(process.env.VITE_DEV_SERVER_PORT || 3036),
      strictPort: true,
      hmr: {
        overlay: false,
        protocol: "ws",
        host: "localhost",
        port: Number(process.env.VITE_DEV_SERVER_PORT || 3036),
        clientPort: Number(process.env.VITE_DEV_SERVER_PORT || 3036),
      },
      headers: isDevelopment ? devViteSecurityHeaders() : {},
      fs: { strict: false },
    },

    /** CSS Options */
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
          includePaths: ["node_modules", "./node_modules"],
        },
      },
      postcss: {
        plugins: [
          removePrefix(),
          tailwindcss(),
          stylehacks({ lint: false }),
          postcssSuperHover(),
          postcssInlineRtl(),
          postcssUrl([
            {
              filter: "**/*.woff2",
              url: "inline",
              encodeType: "base64",
              maxSize: 2_147_483_647,
            },
            {
              url: "inline",
              maxSize: 2_147_483_647,
              encodeType: "encodeURIComponent",
              optimizeSvgEncode: true,
              ignoreFragmentWarning: true,
            },
          ]),
          postcssRemoveRoot(),
          cssMqpacker({
            sort: true,
          }),
          postcssMqOptimize(),
          cssnano({
            preset: [
              "advanced",
              {
                autoprefixer: false,
                discardComments: {
                  removeAllButCopyright: true,
                },
                discardUnused: true,
                reduceIdents: true,
                mergeIndents: true,
                zindex: true,
              },
            ],
          }),
          autoprefixer(),
        ],
      },
    },

    /** Define Options */
    define: commonDefine,

    /** Dependency Optimization */
    optimizeDeps: {
      include: [
        "@hotwired/turbo",
        "@hotwired/stimulus",
        "@rails/request.js",
        "@sentry/browser",
        "stimulus-use",
      ],
      exclude: [
        "@hotwired/turbo",
        "@wllama/wllama/esm/index.js",
        "@vue/runtime-core", // Babel traversal issues
      ],
      ...createOptimizeDepsForce(isDevelopment),
    },

    /** Plugins */
    plugins: [
      isDevelopment
        ? MillionLint.vite({
            enabled: true,
            optimizeDOM: true,
          })
        : undefined,
      coffeescript(),
      nodePolyfills(),
      purgePolyfills.vite(),
      replacements(),
      fixEmulatorsGlobalShimPlugin(),
      isDevelopment ? undefined : verifyVendorChunksPlugin(),
      checkBareSpecifiersPlugin(),
      babel(createBabelOptions(path)),
      rubyPlugin(),
      stimulusHMR(),
      fullReload([
        "config/routes.rb",
        "app/views/**/*",
        "app/javascript/src/**/*",
      ]),
      isDevelopment ? undefined : typehintPlugin,
      isDevelopment
        ? undefined
        : vitePluginBundleObfuscator(allObfuscatorConfig),
      vue(),
    ],
  };
});
