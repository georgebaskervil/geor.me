// Shared Vite config helpers used by both the Rails Vite dev server and Electron Forge.
// Keep this file dependency-free (besides Node builtins) so it can be imported from config files.

import fs from "node:fs";
import path from "node:path";

export const allObfuscatorConfig = {
    excludes: [],
    enable: true,
    log: true,
    autoExcludeNodeModules: true,
    threadPool: true,
    options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        deadCodeInjection: false,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: false,
        identifierNamesGenerator: "hexadecimal",
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: false,
        ignoreImports: true,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: [],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: "variable",
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
    },
};

export function withInstrumentation(p) {
    let modified = 0;
    return {
        ...p,
        async transform(code, id) {
            const out = await p.transform.call(this, code, id);
            if (out && out.code && out.code !== code) modified += 1;
            return out;
        },
        buildEnd() {
            this.info(`[typehints] Files modified: ${modified}`);
            if (p.buildEnd) return p.buildEnd.call(this);
        },
    };
}

export function createTypehintPlugin(typehintsPluginFactory) {
    return withInstrumentation(
        typehintsPluginFactory({
            variableDocumentation: true,
            objectShapeDocumentation: true,
            maxObjectProperties: 6,
            enableCoercions: true,
            parameterHoistCoercions: false,
        }),
    );
}

export function createEsbuildConfig(isDevelopment) {
    return {
        target: "esnext", // Allow latest syntax (class fields/private names)
        keepNames: false,
        treeShaking: isDevelopment ? false : true, // Disable tree shaking in development for faster builds
        legalComments: isDevelopment ? "none" : "inline", // Skip legal comments in development
    };
}

// Shared development headers for Vite dev servers.
//
// These help when the renderer uses COEP/credentialless and embeds content from
// other local origins (different port), which can otherwise cause CORP/COEP
// blocking in Chromium/Electron.
export function devViteSecurityHeaders() {
    const headers = {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        // Dev-only convenience; production builds should use stricter policies.
        // This allows the Vite renderer (https://localhost:5173) to embed the Rails
        // UI (https://localhost:3000) without CORP/COEP confusion.
        "Cross-Origin-Resource-Policy": "cross-origin",
    };

    // COEP makes the document cross-origin isolated and forces CORP/CORS rules
    // on embedded resources (including iframes). This is useful for features
    // like SharedArrayBuffer, but it can break the Electron dev shell when the
    // Rails UI is embedded from another origin/port.
    //
    // Enable explicitly when needed:
    //   VITE_ENABLE_COEP=1
    if (process.env.VITE_ENABLE_COEP === "1") {
        headers["Cross-Origin-Embedder-Policy"] = "credentialless";
    }

    return headers;
}

export function createTerserOptions(isDevelopment) {
    if (isDevelopment) return undefined;

    return {
        parse: {
            bare_returns: false,
            html5_comments: false,
            shebang: false,
        },
        compress: {
            defaults: true,
            arrows: true, // Keep arrow functions
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
            reserved: ["global", "globalThis"],
            toplevel: true,
            safari10: false,
        },
        format: {
            ascii_only: false,
            beautify: false,
            braces: false,
            comments: "some",
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
    };
}

export function createRollupOutputConfig() {
    return {
        minifyInternalExports: true,
        // Use codeSplitting instead of inlineDynamicImports (deprecated)
        // codeSplitting: true is the modern way to control dynamic imports
        generatedCode: {
            preset: "es2015",
        },
        manualChunks(id) {
            // Keep browserify/CJS packages out of the shared vendor chunk so
            // Terser top-level mangling cannot cross-contaminate module registries.
            if (id.includes("node_modules/emulators")) {
                return "emulators";
            }
        },
    };
}

export function createCommonBuild({ isDevelopment, rollupInput } = {}) {
    const build = {
        cache: isDevelopment,
        rollupOptions: {
            input: rollupInput,
            external: (id) => {
                // Mark problematic large libraries as external to prevent bundling/parsing errors
                const problematicDeps = [
                    "plotly.js-dist",
                ];
                return problematicDeps.some(dep => id.includes(dep));
            },
            output: createRollupOutputConfig(),
            treeshake: {
                moduleSideEffects: true,
                propertyReadSideEffects: false,
                unknownGlobalSideEffects: false,
            },
        },
        // Ensure CJS plugin uses a modern parser that understands class private fields
        // (turbo.es2017-esm.js trips esbuild when target is too low).
        commonjsOptions: {
            esbuildTarget: "esnext",
            transformMixedEsModules: true,
            esbuildOptions: {
                target: "esnext",
            },
            exclude: [/node_modules\/@hotwired\/turbo/],
        },
        target: ["esnext"],
        modulePreload: { polyfill: true },
        cssCodeSplit: true,
        // Prebuilt emulator assets must stay as real URLs for <script src> / fetch hijacks.
        assetsInlineLimit(filePath, content) {
            if (filePath.includes("node_modules/emulators/")) return false;
            if (filePath.endsWith(".wasm")) return false;
            return content.length <= 500000;
        },
        cssTarget: ["esnext"],
        sourcemap: false,
        chunkSizeWarningLimit: 2147483647,
        reportCompressedSize: false,
        minify: isDevelopment ? false : "terser",
        terserOptions: createTerserOptions(isDevelopment),
    };

    if (rollupInput) build.rollupOptions.input = rollupInput;

    return build;
}

export function createOptimizeDepsForce(isDevelopment) {
    return {
        force: isDevelopment && process.env.VITE_FORCE_DEPS === "true",
    };
}

export function createTimingProbePlugin({
    label = "vite",
    enabled = true,
    slowMs = 150,
    heartbeatMs = 10_000,
    logFilePath = process.env.VITE_TIMING_LOG_FILE || "tmp/vite-timing.log",
} = {}) {
    if (!enabled) return null;

    let startedAt = 0;
    let heartbeatTimer;

    const writeLine = createTimingLineWriter(logFilePath);

    return {
        name: `timing-probe-${label}`,
        enforce: "pre",
        buildStart() {
            startedAt = performance.now();
            writeLine(`[timing:${label}] buildStart`);
            if (heartbeatMs > 0) {
                heartbeatTimer = setInterval(() => {
                    const elapsed = (
                        (performance.now() - startedAt) /
                        1000
                    ).toFixed(1);
                    writeLine(`[timing:${label}] heartbeat +${elapsed}s`);
                }, heartbeatMs);
            }
        },
        buildEnd() {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            const totalMs = performance.now() - startedAt;
            writeLine(
                `[timing:${label}] buildEnd (${(totalMs / 1000).toFixed(1)}s)`,
            );
        },
    };
}

export function createTimingLineWriter(logFilePath) {
    const resolvedLogPath = path.isAbsolute(logFilePath)
        ? logFilePath
        : path.resolve(process.cwd(), logFilePath);

    return (line) => {
        // eslint-disable-next-line no-console
        console.log(line);
        try {
            fs.mkdirSync(path.dirname(resolvedLogPath), { recursive: true });
            fs.appendFileSync(resolvedLogPath, `${line}\n`, "utf8");
        } catch {
            // Best effort only; never break build due to logging I/O.
        }
    };
}

export function wrapPluginsWithBuildStartTiming(
    plugins,
    {
        label = "vite",
        enabled = true,
        logFilePath = process.env.VITE_TIMING_LOG_FILE || "tmp/vite-timing.log",
        slowHookMs = Number(process.env.VITE_TIMING_HOOK_SLOW_MS || 0),
    } = {},
) {
    if (!enabled) return plugins;

    const writeLine = createTimingLineWriter(logFilePath);
    const HOOKS_TO_WRAP = [
        "config",
        "configResolved",
        "options",
        "buildStart",
        "buildEnd",
        "configureServer",
        "configurePreviewServer",
        "resolveId",
        "load",
    ];

    writeLine(`[timing:${label}] plugin-count ${(plugins || []).length}`);

    const wrapHook = (pluginName, hookName, originalHook) => {
        return async function wrappedHook(...args) {
            const startedAt = performance.now();
            writeLine(`[timing:${label}] ${hookName}:begin ${pluginName}`);
            try {
                return await originalHook.apply(this, args);
            } finally {
                const ms = performance.now() - startedAt;
                if (ms >= slowHookMs) {
                    writeLine(
                        `[timing:${label}] ${hookName}:end ${ms.toFixed(1)}ms ${pluginName}`,
                    );
                }
            }
        };
    };

    return (plugins || []).map((plugin, index) => {
        if (!plugin || typeof plugin !== "object") return plugin;
        const pluginName = plugin.name || `plugin-${index}`;
        const wrapped = { ...plugin };
        let changed = false;
        let hookCount = 0;

        for (const hookName of HOOKS_TO_WRAP) {
            const hook = wrapped[hookName];
            if (typeof hook === "function") {
                wrapped[hookName] = wrapHook(pluginName, hookName, hook);
                changed = true;
                hookCount += 1;
                continue;
            }
            if (
                hook &&
                typeof hook === "object" &&
                typeof hook.handler === "function"
            ) {
                wrapped[hookName] = {
                    ...hook,
                    handler: wrapHook(pluginName, hookName, hook.handler),
                };
                changed = true;
                hookCount += 1;
            }
        }

        if (hookCount > 0) {
            writeLine(
                `[timing:${label}] wrapped ${pluginName} hooks=${hookCount}`,
            );
        } else {
            writeLine(`[timing:${label}] skipped ${pluginName} hooks=0`);
            changed = true;
        }

        return changed ? wrapped : plugin;
    });
}

// Do not map `global` → `globalThis` here: browserify bundles (emulators/core-js)
// detect the real global via `typeof global` / window / self. Replacing `global`
// bakes `globalThis` into the chunk and Terser can mangle it into the same
// symbol as unrelated code (e.g. React), breaking core-js shared-store init.
export const commonDefine = {};

export const commonLegacyOptions = {
    targets: ["chrome 142"],
    renderLegacyChunks: false,
    modernTargets: ["chrome 142"],
    modernPolyfills: true,
};

export function createBabelOptions(pathModule) {
    return {
        // Use include/exclude instead of deprecated filter pattern
        include: /\.(js|coffee)$/,
        exclude: [
            /node_modules\/(?:@hotwired\/stimulus|@hotwired\/turbo|@huggingface\/jinja|onnxruntime-web|lenis|emulators|plotly\.js-dist|@vue\/runtime-core|three)/,
            /textcomplete\.min\.js$/,
            /ort-web\.min\.js$/,
        ],
        babelConfig: {
            babelrc: false,
            configFile: false,
            plugins: [
                ["closure-elimination"],
                ["module:faster.js"],
                [
                    "object-to-json-parse",
                    {
                        minJSONStringSize: 1024,
                    },
                ],
            ],
        },
    };
}

export function createCommonCss(removePrefixPluginFactory) {
    return {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler",
                includePaths: ["node_modules", "./node_modules"],
            },
        },
        postcss: {
            plugins: [
                removePrefixPluginFactory(),
                // The rest are configured by caller because they import different modules.
            ],
        },
    };
}
