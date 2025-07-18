import MillionLint from "@million/lint";
import { defineConfig } from "vite";
import rubyPlugin from "vite-plugin-ruby";
import fullReload from "vite-plugin-full-reload";
import stimulusHMR from "vite-plugin-stimulus-hmr";
import legacy from "@vitejs/plugin-legacy";
import postcssPresetEnv from "postcss-preset-env";
import postcssFlexbugsFixes from "postcss-flexbugs-fixes";
import cssnano from "cssnano";
import tailwindcss from "tailwindcss";
import coffee from "vite-plugin-coffee";
import vitePluginCompression from "vite-plugin-compression";
import { constants } from "node:zlib";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  resolve: {
    extensions: [".js", ".coffee", ".scss"],
  },
  assetsInclude: ["**/*.jsdos", "**/*.gguf"],
  build: {
    sourcemap: true,
    cache: true,
    rollupOptions: {
      output: {
        entryFileNames: "[name]-[hash].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name]-[hash].[ext]",
      },
    },
  },
  server: {
    hmr: { overlay: false },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
    postcss: {
      plugins: [
        tailwindcss(),
        postcssPresetEnv({ stage: 3 }),
        postcssFlexbugsFixes(),
        cssnano({
          preset: [
            "advanced",
            {
              autoprefixer: false,
              discardComments: { removeAllButCopyright: true },
              normalizeString: true,
              normalizeUrl: true,
              normalizeCharset: true,
            },
          ],
        }),
      ],
    },
  },
  plugins: [
    MillionLint.vite({
      enabled: true,
      optimizeDOM: true,
    }),
    rubyPlugin(),
    fullReload(["config/routes.rb", "app/views/**/*"]),
    vue(),
    coffee({
      jsx: false,
    }),
    stimulusHMR(),
    legacy({
      renderLegacyChunks: true,
      modernPolyfills: true,
      terserOptions: {
        ecma: 5,
        warnings: true,
        mangle: {
          properties: false,
          safari10: true,
          toplevel: false,
        },
        compress: {
          defaults: true,
          arrows: false,
          booleans_as_integers: false,
          booleans: true,
          collapse_vars: true,
          comparisons: true,
          conditionals: true,
          dead_code: true,
          drop_console: true,
          directives: true,
          evaluate: true,
          hoist_funs: true,
          if_return: true,
          join_vars: true,
          keep_fargs: false,
          loops: true,
          negate_iife: true,
          passes: 3,
          properties: true,
          reduce_vars: true,
          sequences: true,
          side_effects: true,
          toplevel: false,
          typeofs: false,
          unused: true,
        },
        output: {
          comments: /(?:copyright|licence|©)/i,
          beautify: false,
          semicolons: true,
        },
        keep_classnames: false,
        keep_fnames: false,
        safari10: true,
        module: true,
      },
    }),
  ],
});
