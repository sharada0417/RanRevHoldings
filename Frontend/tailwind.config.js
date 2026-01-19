// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sinhala: ["Noto Sans Sinhala", "sans-serif"],
        gemunu: ["Gemunu Libre", "sans-serif"],
      },
    },
  },
  plugins: [],
};
