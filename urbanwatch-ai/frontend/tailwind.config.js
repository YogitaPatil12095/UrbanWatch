/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: "#0A192F", light: "#112240", dark: "#060F1E" },
        teal:  { DEFAULT: "#64FFDA", dim: "#3DBFA3",   dark: "#1A7A63" },
        lav:   { DEFAULT: "#CCD6F6", dim: "#8892B0",   dark: "#495670" },
        coral: { DEFAULT: "#FF6B6B", dim: "#E05555",   dark: "#B33A3A" },
      },
      fontFamily: {
        sans: ["Sansation", "Segoe UI", "sans-serif"],
        body: ["Sansation", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
