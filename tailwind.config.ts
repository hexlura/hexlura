import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: "var(--border)",
        accent: "var(--accent)",
        gold: "var(--gold)",
        text: "var(--text)",
        muted: "var(--muted)",
        success: "var(--success)",
        hexred: "#ea2845",
        hexred2: "#ff4d67",
        hexdark: "#0f0f0f",
        hexlight: "#f8f9fa",
        hexyellow: "#f5c518",
        hexviolet: "#7c5cff",
        hexcyan: "#22d3ee",
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        heading: ["var(--font-heading)"],
        mono: ["var(--font-mono)"],
        selling: ["var(--font-selling)", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern":
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%23000000' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E\")",
        barcode:
          "repeating-linear-gradient(to right, #000, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px, transparent 5px, transparent 8px, #000 8px, #000 12px, transparent 12px, transparent 14px)",
      },
    },
  },
  plugins: [],
};
export default config;
