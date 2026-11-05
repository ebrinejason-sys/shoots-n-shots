import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F2E9",
        surface: "#FCFAF4",
        line: "#E0D8C9",
        ink: "#141210",
        mute: "#6E6659",
        accent: {
          DEFAULT: "#1F4B43",
          soft: "#E4ECE7",
        },
        hot: {
          DEFAULT: "#B23A22",
          soft: "#F7E4DE",
        },
        cobalt: {
          DEFAULT: "#2A4A7F",
          soft: "#E3E9F4",
        },
        gold: {
          DEFAULT: "#9A6A0E",
          soft: "#F6ECD2",
        },
        plum: {
          DEFAULT: "#6B3F5E",
          soft: "#F0E5EC",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "ui-serif", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "2px",
        "2xl": "3px",
        "3xl": "4px",
      },
      maxWidth: {
        page: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
