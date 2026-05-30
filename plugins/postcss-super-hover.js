import selectorParser from "postcss-selector-parser";

export default function postcssSuperHover(options = {}) {
  const attribute = options.attribute ?? "data-super-hover-active";

  return {
    postcssPlugin: "postcss-super-hover",
    Rule(rule) {
      if (!rule.selector.includes(":hover")) return;

      const extraSelectors = [];

      const transform = selectorParser((selectors) => {
        selectors.each((selector) => {
          let hasHover = false;
          selector.walk((node) => {
            if (node.type === "pseudo" && node.value === ":hover")
              hasHover = true;
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

      if (extraSelectors.length > 0) {
        rule.selector = `${rule.selector},\n${extraSelectors.join(",\n")}`;
      }
    },
  };
}

postcssSuperHover.postcss = true;
