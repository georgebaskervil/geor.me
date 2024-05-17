import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: 'https://georgebaskerville.me',
  integrations: [tailwind(), sitemap()]
});