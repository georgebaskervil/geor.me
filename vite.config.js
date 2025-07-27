import MillionLint from "@million/lint";
import { defineConfig } from "vite";
import rubyPlugin from "vite-plugin-ruby";
import fullReload from "vite-plugin-full-reload";
import stimulusHMR from "vite-plugin-stimulus-hmr";
import legacy from "@vitejs/plugin-legacy";
import cssnano from "cssnano";
import tailwindcss from "tailwindcss";
import coffee from "vite-plugin-coffee";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development";

  return {
    /** Esbuild Options */
    esbuild: {
      target: "es2020",
      keepNames: false,
      treeShaking: isDevelopment ? false : true,
      legalComments: isDevelopment ? "none" : "inline",
    },

    /** Resolve Options */
    resolve: {
      extensions: [".js", ".json", ".coffee", ".scss"],
    },

    /** Asset Inclusion */
    assetsInclude: ["**/*.jsdos", "**/*.gguf"],

    /** Build Options */
    build: {
      sourcemap: isDevelopment,
      cache: true,
      rollupOptions: {
        input: {
          application: "app/javascript/application.js",
        },
        output: {
          entryFileNames: "[name]-[hash].js",
          chunkFileNames: "[name]-[hash].js",
          assetFileNames: "[name]-[hash].[ext]",
          minifyInternalExports: true,
          inlineDynamicImports: false,
          compact: true,
          generatedCode: {
            preset: "es2015",
            arrowFunctions: true,
            constBindings: true,
            objectShorthand: true,
          },
        },
        external: [],
        treeshake: {
          moduleSideEffects: true,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false,
        },
      },
      target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
      modulePreload: { polyfill: true },
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      cssTarget: ["esnext"],
      chunkSizeWarningLimit: 2147483647,
      reportCompressedSize: false,
      minify: "terser",
      terserOptions: {
        parse: {
          bare_returns: false,
          html5_comments: false,
          shebang: false,
          ecma: 2020,
        },
        compress: {
          defaults: true,
          arrows: true,
          arguments: true,
          booleans: true,
          booleans_as_integers: false,
          collapse_vars: true,
          comparisons: true,
          computed_props: true,
          conditionals: true,
          dead_code: true,
          directives: true,
          drop_console: true,
          drop_debugger: true,
          ecma: 2020,
          evaluate: true,
          expression: false,
          global_defs: {},
          hoist_funs: true,
          hoist_props: true,
          hoist_vars: true,
          if_return: true,
          inline: true,
          join_vars: true,
          keep_classnames: false,
          keep_fargs: true,
          keep_fnames: false,
          keep_infinity: false,
          loops: true,
          negate_iife: true,
          passes: 10,
          properties: true,
          pure_getters: "strict",
          pure_funcs: [
            "console.log",
            "console.info",
            "console.debug",
            "console.warn",
            "console.error",
            "console.trace",
            "console.dir",
            "console.dirxml",
            "console.group",
            "console.groupCollapsed",
            "console.groupEnd",
            "console.time",
            "console.timeEnd",
            "console.timeLog",
            "console.assert",
            "console.count",
            "console.countReset",
            "console.profile",
            "console.profileEnd",
            "console.table",
            "console.clear",
          ],
          reduce_vars: true,
          reduce_funcs: true,
          sequences: true,
          side_effects: true,
          switches: true,
          toplevel: true,
          top_retain: null,
          typeofs: true,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_Function: true,
          unsafe_math: true,
          unsafe_symbols: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          unsafe_undefined: true,
          unused: true,
        },
        mangle: {
          eval: false,
          keep_classnames: false,
          keep_fnames: false,
          reserved: [],
          toplevel: true,
          safari10: false,
        },
        format: {
          ascii_only: false,
          beautify: false,
          braces: false,
          comments: "some",
          ecma: 2020,
          indent_level: 0,
          inline_script: true,
          keep_numbers: false,
          keep_quoted_props: false,
          max_line_len: 0,
          quote_keys: false,
          preserve_annotations: false,
          safari10: false,
          semicolons: true,
          shebang: false,
          webkit: false,
          wrap_iife: false,
          wrap_func_args: false,
        },
      },
    },

    /** Server Options */
    server: {
      hmr: { overlay: true },
      headers: isDevelopment
        ? {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          }
        : {},
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
          tailwindcss(),
          cssnano({
            preset: [
              "advanced",
              {
                autoprefixer: true,
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

    /** Define Options */
    define: {
      global: "globalThis",
    },

    /** Dependency Optimization */
    optimizeDeps: {
      include: [
        "@hotwired/turbo",
        "@hotwired/stimulus",
      ],
      exclude: [
        // Add problematic dependency here
        "@wllama/wllama/esm/index.js"
      ],
      force: isDevelopment && process.env.VITE_FORCE_DEPS === "true",
    },

    /** Plugins */
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
  };
});