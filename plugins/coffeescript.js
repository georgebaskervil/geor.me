import CoffeeScript from "coffeescript";

/**
 * Vite plugin to compile .coffee files.
 * @param {import('coffeescript').CompileOptions} userOptions
 * @returns {import('vite').Plugin}
 */

export default function coffeescript(userOptions = {}) {
    const baseOptions = {
        bare: true,
        sourceMap: false,
    };

    return {
        name: "coffeescript",
        enforce: "pre",
        transform(code, id) {
            if (!id.endsWith(".coffee")) return;

            const options = { ...baseOptions, ...userOptions, filename: id };

            try {
                const compiled = CoffeeScript.compile(code, options);
                if (typeof compiled === "string") {
                    return { code: compiled, map: undefined };
                }
                const map =
                    compiled.v3SourceMap || compiled.sourceMap || undefined;
                return { code: compiled.js, map };
            } catch (error) {
                this.error(error);
            }
        },
    };
}
