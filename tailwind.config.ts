import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          950: "#080a0f",
          900: "#0b0e14",
          800: "#111620",
          700: "#1b2230",
          600: "#283244",
        },
      },
      boxShadow: {
        glow: "0 0 80px rgba(239, 68, 68, 0.12)",
        "glow-blue": "0 0 80px rgba(96, 165, 250, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;