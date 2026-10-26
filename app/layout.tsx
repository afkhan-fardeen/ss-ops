import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { inter, jetbrainsMono } from "./fonts";
import { MotionProviders } from "@/components/motion/MotionProviders";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export const metadata: Metadata = {
  title: "Seissense Ops",
  description: "Internal operations portal",
  applicationName: "Seissense Ops",
  appleWebApp: { capable: true, title: "Seissense Ops", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/favicon.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon-256.png", sizes: "256x256", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased relative min-h-screen bg-canvas`}
      >
        <PwaProvider>
          <MotionProviders>{children}</MotionProviders>
        </PwaProvider>
        <Toaster position="bottom-center" richColors closeButton mobileOffset={{ bottom: "calc(var(--mobile-nav-h) + 12px)" }} offset={24} />
      </body>
    </html>
  );
}
