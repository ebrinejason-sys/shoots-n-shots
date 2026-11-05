import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#05070f",
        surface: "#0b0f1a",
        line: "#1d2433",
        ink: "#f2f0ea",
        mute: "#8b93a6",
        accent: {
          DEFAULT: "#2f6dff",
          soft: "#0f1b3d",
        },
        hot: {
          DEFAULT: "#ff2e43",
          soft: "#3a0b12",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
