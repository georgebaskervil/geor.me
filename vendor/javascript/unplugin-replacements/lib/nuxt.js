import {addVitePlugin, addWebpackPlugin, defineNuxtModule} from '@nuxt/kit';
import vite from './vite.js';
import webpack from './webpack.js';
export default defineNuxtModule({
  meta: {
    name: '@e18e/unplugin-replacements',
    configKey: 'e18eReplacements'
  },
  defaults: {},
  setup(options) {
    addVitePlugin(() => vite(options));
    addWebpackPlugin(() => webpack(options));
  }
});
