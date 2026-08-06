import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { jakarta, jetbrainsMono, sora } from "./fonts";
import { MotionProviders } from "@/components/motion/MotionProviders";
import { MeshBackground } from "@/components/motion/MeshBackground";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
      <body
        className={`${sora.variable} ${jakarta.variable} ${jetbrainsMono.variable} font-sans antialiased relative min-h-screen bg-canvas`}
      >
        <MeshBackground />
        <div className="relative z-10 min-h-screen">
          <MotionProviders>{children}</MotionProviders>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
