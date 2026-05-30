// postcss-super-hover.js
const selectorParser = require('postcss-selector-parser');

module.exports = (opts = {}) => {
  const attribute = opts.attribute ?? 'data-super-hover-active';

  return {
    postcssPlugin: 'postcss-super-hover',
    Rule(rule) {
      if (!rule.selector.includes(':hover')) return;

      const extraSelectors = [];

      const transform = selectorParser(selectors => {
        selectors.each(selector => {
          // Check if this particular selector has a :hover pseudo
          let hasHover = false;
          selector.walk(node => {
            if (node.type === 'pseudo' && node.value === ':hover') hasHover = true;
          });
          if (!hasHover) return;

          // Clone and replace :hover with [data-super-hover-active]
          const cloned = selector.clone();
          cloned.walk(node => {
            if (node.type === 'pseudo' && node.value === ':hover') {
              node.replaceWith(
                selectorParser.attribute({ attribute, insensitive: false })
              );
            }
          });
          extraSelectors.push(String(cloned).trim());
        });
      });

      transform.processSync(rule.selector);

      if (extraSelectors.length) {
        rule.selector = rule.selector + ',\n' + extraSelectors.join(',\n');
      }
    }
  };
};

module.exports.postcss = true;