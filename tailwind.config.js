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
        neutral: "#3C3F47",
        text: "#F5F5F5",
        accent: "#B0A2C6",
        mamba: "#898296",
        background: "#2C2A2F",
      },
    },
  },
  plugins: [tailwindScrollbarHide],
};
