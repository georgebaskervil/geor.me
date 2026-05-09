import unplugin from './main.js';
export default (options) => ({
    name: '@e18e/unplugin-replacements',
    hooks: {
        'astro:config:setup': async (astro) => {
            astro.config.vite.plugins ||= [];
            astro.config.vite.plugins.push(unplugin.vite(options));
        }
    }
});
