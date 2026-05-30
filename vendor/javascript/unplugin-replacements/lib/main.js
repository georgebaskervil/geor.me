import {createUnplugin} from 'unplugin';
import * as codemods from '@e18e/web-features-codemods';
export const unpluginFactory = (options) => {
  const includedCodemods = options?.include;
  const excludedCodemods = options?.exclude;
  return {
    name: '@e18e/unplugin-replacements',
    transform: {
      filter: {
        id: /\.ts$/
      },
      handler(code) {
        let output = code;
        for (const [codemodName, codemod] of Object.entries(codemods)) {
          if (includedCodemods && !includedCodemods.includes(codemodName)) {
            continue;
          }
          if (excludedCodemods && excludedCodemods.includes(codemodName)) {
            continue;
          }
          output = codemod.apply({
            source: output
          });
        }
        return output;
      }
    }
  };
};
export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);
export default unplugin;
