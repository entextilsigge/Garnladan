import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        krita: "#F7F2E8",
        linne: "#EFE6D6",
        sand: "#E2D3BC",
        tegel: {
          DEFAULT: "#A64B33",
          dark: "#8A3B27",
          light: "#C46B52",
        },
        senap: {
          DEFAULT: "#C08A2B",
          dark: "#9E6F1F",
        },
        gran: {
          DEFAULT: "#2E463A",
          dark: "#21352B",
          light: "#4A6455",
        },
        cognac: "#8A5A33",
        kol: "#241C14",
        mull: "#5E4C3A",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-karla)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        mjuk: "0 2px 12px -2px rgba(36, 28, 20, 0.08), 0 8px 32px -8px rgba(36, 28, 20, 0.1)",
        lyft: "0 4px 16px -2px rgba(36, 28, 20, 0.12), 0 16px 48px -12px rgba(36, 28, 20, 0.18)",
        inre: "inset 0 1px 3px rgba(36, 28, 20, 0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "slide-in": "slide-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
