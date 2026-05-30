/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        viola: {
          50: "#f0f4ff",
          600: "#3b5bdb",
          700: "#2f4ac4",
        },
      },
    },
  },
  plugins: [],
};
