import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minimal monochrome accent built on slate — near-black primary,
        // whisper-light surfaces. Reusing the `brand-*` scale recolors the
        // whole app in one place.
        brand: {
          50: "#f8fafc",
          100: "#f1f5f9",
          500: "#334155",
          600: "#1e293b",
          700: "#0f172a",
        },
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
