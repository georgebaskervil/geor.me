/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
    theme: {
      extend: {
        colors: {
          'neutral': '#2D2A2A',
          'text': '#D6D6D6',
        }
      },
    },
    plugins: [require("@tailwindcss/typography")], 
};