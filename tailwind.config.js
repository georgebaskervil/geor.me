import tailwindScrollbarHide from "tailwind-scrollbar-hide";

export default {
  content: [
    "./app//stylesheets/**/*.scss",
    "./app/views/**/*.erb",
    "./app/helpers/**/*.rb",
    "./app/javascript/**/*.js",
    "./app/javascript/components/**/*.{js,jsx,ts,tsx}",
    "./app/components/**/*.html.erb",
  ],
  theme: {
    extend: {
      colors: {
        neutral: "#2D2A2A",
        text: "#c6c2c7",
        accent: "#c39399",
        mamba: "#898296",
        background: "#161820",
      },
    },
  },
  plugins: [tailwindScrollbarHide],
};
