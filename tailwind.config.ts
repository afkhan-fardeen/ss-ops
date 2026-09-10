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
        canvas: "#FAFAF9",
        ink: "#1A1A1A",
        muted: "rgba(26,26,26,0.55)",
        line: "rgba(26,26,26,0.10)",
        // Three domain colors instead of one-per-module (was 8 distinct hues —
        // see docs/design-plan.md drift note). Orders: cod/fulfillment/awb share
        // teal-green. Inventory: stock/stock-analysis/ubex-inventory share olive.
        // Finance: subscriptions/zoho-books share purple. Icon + label carry the
        // individual module identity within a domain, not color.
        cod: {
          DEFAULT: "#2F9E7F",
          bg: "rgba(47,158,127,0.15)",
          bloom: "#9FDCCB",
        },
        fulfillment: {
          DEFAULT: "#2F9E7F",
          bg: "rgba(47,158,127,0.15)",
          bloom: "#9FDCCB",
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
          DEFAULT: "#6B8A3E",
          bg: "rgba(107,138,62,0.15)",
        },
        "ubex-inventory": {
          DEFAULT: "#6B8A3E",
          bg: "rgba(107,138,62,0.15)",
        },
        awb: {
          DEFAULT: "#2F9E7F",
          bg: "rgba(47,158,127,0.15)",
          bloom: "#9FDCCB",
        },
        subscriptions: {
          DEFAULT: "#6B4FA2",
          bg: "rgba(107,79,162,0.15)",
          bloom: "#C4B8E8",
        },
        "zoho-books": {
          DEFAULT: "#6B4FA2",
          bg: "rgba(107,79,162,0.15)",
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
        card: "6px",
      },
      backdropBlur: {
        glass: "28px",
      },
      boxShadow: {
        // Flat at rest — the border does the work. Shadow is reserved for hover/pop.
        soft: "0 1px 2px rgba(15, 23, 42, 0.02)",
        pop: "0 10px 30px -12px rgba(15, 23, 42, 0.20), 0 4px 10px -6px rgba(15, 23, 42, 0.10)",
        glass: "0 8px 30px rgba(120,100,60,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
