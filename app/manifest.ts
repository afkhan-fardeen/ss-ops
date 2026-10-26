import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seissense Ops",
    short_name: "Ops",
    description: "Internal operations portal for Seissense.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#FFFFFF",
    lang: "en",
    categories: ["business", "productivity"],
    display_override: ["standalone", "minimal-ui"],
    shortcuts: [
      { name: "Fulfillment", short_name: "Fulfil", url: "/fulfillment/list", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "AWB Lookup", short_name: "AWB", url: "/awb", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Stock balance", short_name: "Stock", url: "/stock-balance/balance", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
