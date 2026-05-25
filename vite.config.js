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
// import legacy from "vite-plugin-legacy-swc"; // TODO: Disabled due to Rolldown compatibility issues
import vitePluginBundleObfuscator from "vite-plugin-bundle-obfuscator";
import { purgePolyfills } from "unplugin-purge-polyfills";
import replacements from "./vendor/javascript/unplugin-replacements/lib/vite.js";
import coffeescript from "./plugins/coffeescript.js";
import typehints from "./plugins/typehints.js";
import removePrefix from "./plugins/postcss-remove-prefix.js";
import {
    allObfuscatorConfig,
    commonDefine,
    commonLegacyOptions,
    createBabelOptions,
    createCommonBuild,
    createEsbuildConfig,
    createOptimizeDepsForce,
    createTypehintPlugin,
    devViteSecurityHeaders,
} from "./config/vite/common.js";
import path from "node:path";

function checkBareSpecifiersPlugin() {
  const staticImportPattern = /(?:\b(?:import|export)\b[^;]{0,200}?\bfrom\s+['"]([^./][^'"]*)['"])/g;
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
        "plotly.js-dist", // Stack overflow issues
        "@vue/runtime-core", // Babel traversal issues
      ],
      ...createOptimizeDepsForce(isDevelopment),
    },

    /** Plugins */
    plugins: [
      MillionLint.vite({
        enabled: true,
        optimizeDOM: true,
      }),
      coffeescript(),
      nodePolyfills(),
      purgePolyfills.vite(),
      replacements(),
      checkBareSpecifiersPlugin(),
      // TODO: vite-plugin-legacy-swc has compatibility issues with Rolldown
      // Disabled for now - legacy browser support can be re-enabled with updated plugin
      // legacy(commonLegacyOptions),
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
