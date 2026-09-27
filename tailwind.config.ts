import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B2430",
        paper: "#F7F8FA",
        line: "#DDE2E8",
        accent: "#2C5F6B",
        accentSoft: "#E5EEEF",
        warn: "#B5541B",
        danger: "#A2321F",
        ok: "#2E6B44",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
