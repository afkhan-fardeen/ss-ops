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
        // Seissense Ops design system — see design-plan.md
        canvas: "#F6F4EE",
        ink: "#1E1D1A",
        muted: "rgba(30,29,26,0.55)",
        line: "rgba(30,29,26,0.15)",
        cod: {
          DEFAULT: "#2F9E7F",
          bg: "rgba(47,158,127,0.15)",
          bloom: "#9FDCCB",
        },
        fulfillment: {
          DEFAULT: "#C4553A",
          bg: "rgba(196,85,58,0.15)",
          bloom: "#F0AE96",
        },
        stock: {
          DEFAULT: "#6B8A3E",
          bg: "rgba(107,138,62,0.15)",
          bloom: "#F0CE7E",
        },
        "stock-b": {
          DEFAULT: "#5C6B73",
          bg: "rgba(92,107,115,0.12)",
        },
        "stock-analysis": {
          DEFAULT: "#4A6FA5",
          bg: "rgba(74,111,165,0.15)",
        },
        awb: {
          DEFAULT: "#2E6BAF",
          bg: "rgba(46,107,175,0.15)",
          bloom: "#A8C4E8",
        },
        subscriptions: {
          DEFAULT: "#6B4FA2",
          bg: "rgba(107,79,162,0.15)",
          bloom: "#C4B8E8",
        },
        gold: "#B8842E",
      },
      fontFamily: {
        sans: [
          "var(--font-body)",
          "Plus Jakarta Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Sora",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "20px",
      },
      backdropBlur: {
        glass: "28px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
        pop: "0 10px 30px -12px rgba(15, 23, 42, 0.20), 0 4px 10px -6px rgba(15, 23, 42, 0.10)",
        glass: "0 8px 30px rgba(120,100,60,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
