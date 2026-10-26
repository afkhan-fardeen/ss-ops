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
        // Neutral slate scale + one indigo accent (standard modern-admin palette).
        canvas: "#F8FAFC", // page background (slate-50)
        ink: "#0F172A", // primary text (slate-900)
        muted: "#64748B", // secondary text (slate-500)
        line: "#E2E8F0", // borders / dividers (slate-200)
        primary: {
          DEFAULT: "#4F46E5", // indigo-600
          soft: "#EEF2FF", // indigo-50
        },
        "stock-b": {
          DEFAULT: "#64748B",
          bg: "rgba(100,116,139,0.10)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-body)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
        pop: "0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
