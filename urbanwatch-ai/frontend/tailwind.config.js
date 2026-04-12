/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:      "#1A1A2E",
          "primary-l":  "#2D2D4A",
          "primary-d":  "#0F0F1A",
          accent:       "#E94560",
          "accent-l":   "#FF6B7A",
          "accent-d":   "#C73650",
          secondary:    "#F5F0EB",
          "secondary-d":"#E8E0D8",
          teal:         "#16A085",
        },
        // keep legacy aliases so existing classes still compile
        neon: {
          blue:  "#E94560",
          pink:  "#FF6B7A",
          green: "#16A085",
        },
        dark: {
          900: "#0F0F1A",
          800: "#1A1A2E",
          700: "#2D2D4A",
          600: "#2D2D4A",
          500: "#3a3a5c",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "scan": "scan 3s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px #00d4ff, 0 0 10px #00d4ff" },
          "100%": { boxShadow: "0 0 20px #00d4ff, 0 0 40px #00d4ff, 0 0 60px #00d4ff" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};
