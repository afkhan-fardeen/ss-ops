import { JetBrains_Mono, Plus_Jakarta_Sans, Sora } from "next/font/google";

/** Display face — greetings, page titles, module headers. Weights capped at 500 per design-plan.md. */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-display",
  display: "swap",
});

/** Body face — everything else that isn't a number or an ID. */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap",
});

/** Data face — FX rates, tracking numbers, BHD totals, timestamps, order counts. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-mono",
  display: "swap",
});
