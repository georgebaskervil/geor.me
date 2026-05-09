function removePrefix() {
    return {
        postcssPlugin: "remove-prefix",
        Declaration(decl) {
            decl.prop = decl.prop.replace(/^-\w+-/, "");
        },
    };
}
removePrefix.postcss = true;
export default removePrefix;
