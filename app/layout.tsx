import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Acumin Pro is served via Adobe Fonts (Typekit).
// The @import is in globals.css. We still load Inter as a fallback so
// text never renders in system-default sans-serif during the Adobe Fonts FOUT.

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seissense Ops",
  description: "Internal operations portal",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon-256.png", sizes: "256x256", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.variable}>{children}</body>
    </html>
  );
}
