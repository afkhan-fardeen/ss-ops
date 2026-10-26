import { Inter, JetBrains_Mono } from "next/font/google";

/** UI face for headings and body copy. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

/** Data face — IDs, tracking numbers, amounts, timestamps. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});
