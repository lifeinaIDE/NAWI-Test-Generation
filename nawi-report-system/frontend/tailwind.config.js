/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand tokens
        primary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          500: "#64748b",
          600: "#475569",
          900: "#0f172a",
          950: "#020617",
        },
        // OIML Compliance State Tokens
        pass: {
          DEFAULT: "#10b981", // Emerald 500
          light: "#d1fae5",
          dark: "#065f46",
          bg: "#064e3b33",
        },
        fail: {
          DEFAULT: "#f43f5e", // Rose 500
          light: "#ffe4e6",
          dark: "#9f1239",
          bg: "#88133733",
        },
        warning: {
          DEFAULT: "#f59e0b", // Amber 500
          light: "#fef3c7",
          dark: "#92400e",
          bg: "#78350f33",
        },
        info: {
          DEFAULT: "#0ea5e9", // Sky 500
          light: "#e0f2fe",
          dark: "#0369a1",
          bg: "#0c4a6e33",
        },
        // Status chips tokens
        status: {
          draft: "#71717a",
          inProgress: "#38bdf8",
          submitted: "#fbbf24",
          queryRaised: "#c084fc",
          approved: "#34d399",
          rejected: "#fb7185",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
