import type { Config } from "tailwindcss";

/**
 * Design tokens — see docs/design-system.md. Rules:
 *  - 4px grid: spacing/line-heights are multiples of 4.
 *  - 8 type roles only (size + line-height; weight is chosen explicitly: 400 / 500 / 600).
 *  - 3 radii (control, card, sheet) + full for pills.
 *  - Neutral slate + one indigo accent + 4 semantic colours, all >= 4.5:1 text contrast.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F8FAFC", // page background
        ink: "#0F172A", // primary text
        muted: "#5B6B82", // secondary text (5.2:1 on canvas)
        line: "#E2E8F0", // borders, dividers
        primary: {
          DEFAULT: "#4F46E5",
          strong: "#4338CA", // pressed / text on primary-soft
          soft: "#EEF2FF",
        },
        // Semantic colours: `DEFAULT` is TEXT/ICON colour on white or on `soft` (>= 4.5:1); `soft` backgrounds; `line` borders.
        success: { DEFAULT: "#15803D", soft: "#F0FDF4", line: "#BBF7D0" },
        warning: { DEFAULT: "#B45309", soft: "#FFFBEB", line: "#FDE68A" },
        danger: { DEFAULT: "#B91C1C", soft: "#FEF2F2", line: "#FECACA" },
        info: { DEFAULT: "#1D4ED8", soft: "#EFF6FF", line: "#BFDBFE" },
        "stock-b": { DEFAULT: "#5B6B82", bg: "rgba(91,107,130,0.10)" },
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
      fontSize: {
        // role: [size, { lineHeight }] — values switch at md via CSS variables (globals.css)
        display: ["var(--t-display)", { lineHeight: "var(--t-display-lh)", letterSpacing: "-0.01em" }],
        title: ["var(--t-title)", { lineHeight: "var(--t-title-lh)", letterSpacing: "-0.005em" }],
        heading: ["var(--t-heading)", { lineHeight: "var(--t-heading-lh)" }],
        "body-lg": ["var(--t-body-lg)", { lineHeight: "var(--t-body-lg-lh)" }],
        body: ["14px", { lineHeight: "20px" }],
        "body-sm": ["13px", { lineHeight: "20px" }],
        caption: ["12px", { lineHeight: "16px" }],
        code: ["13px", { lineHeight: "20px" }],
      },
      borderRadius: {
        control: "8px", // buttons, inputs, chips (rect), small tiles
        card: "12px", // cards, lists, tables
        sheet: "16px", // top corners of bottom sheets, dialogs
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
