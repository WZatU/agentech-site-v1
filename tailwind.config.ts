import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        "ink-soft": "#0f1b2e",
        "ink-line": "#1c2940",
        slate: "#9aa8bf",
        mist: "#d8e1ef",
        accent: "#7cc4ff",
        success: "#86d2a7"
      },
      boxShadow: {
        panel: "0 12px 40px rgba(2, 8, 23, 0.35)"
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(154, 168, 191, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(154, 168, 191, 0.08) 1px, transparent 1px)"
      },
      animation: {
        rise: "rise 700ms ease-out forwards"
      },
      keyframes: {
        rise: {
          "0%": {
            opacity: "0",
            transform: "translateY(18px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        }
      }
    }
  },
  plugins: []
};

export default config;
