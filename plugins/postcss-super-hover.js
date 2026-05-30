import selectorParser from "postcss-selector-parser";

export default function postcssSuperHover(opts = {}) {
  const attribute = opts.attribute ?? "data-super-hover-active";

  return {
    postcssPlugin: "postcss-super-hover",
    Rule(rule) {
      if (!rule.selector.includes(":hover")) return;

      const extraSelectors = [];

      const transform = selectorParser((selectors) => {
        selectors.each((selector) => {
          let hasHover = false;
          selector.walk((node) => {
            if (node.type === "pseudo" && node.value === ":hover") hasHover = true;
          });
          if (!hasHover) return;

          const cloned = selector.clone();
          cloned.walk((node) => {
            if (node.type === "pseudo" && node.value === ":hover") {
              node.replaceWith(
                selectorParser.attribute({ attribute, insensitive: false }),
              );
            }
          });
          extraSelectors.push(String(cloned).trim());
        });
      });

      transform.processSync(rule.selector);

      if (extraSelectors.length) {
        rule.selector = `${rule.selector},\n${extraSelectors.join(",\n")}`;
      }
    },
  };
}

postcssSuperHover.postcss = true;
