import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        portal: {
          bg: "var(--bg)",
          bg2: "var(--bg2)",
          bg3: "var(--bg3)",
          border: "var(--border)",
          text: "var(--text)",
          text2: "var(--text2)",
          text3: "var(--text3)",
          accent: "var(--accent)",
          accentSoft: "var(--accent-soft)",
          accentContrast: "var(--accent-contrast)",
          green: "var(--green)",
          greenSoft: "var(--green-soft)",
          amber: "var(--amber)",
          amberSoft: "var(--amber-soft)",
          red: "var(--red)",
          redSoft: "var(--red-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
        pop: "0 10px 30px -12px rgba(15, 23, 42, 0.20), 0 4px 10px -6px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
