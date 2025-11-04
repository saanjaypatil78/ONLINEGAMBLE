/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7c3aed",
          light: "#a855f7",
          dark: "#5b21b6",
        },
      },
    },
  },
  plugins: [],
};