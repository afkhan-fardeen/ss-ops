/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // The COD module was removed; send old bookmarks to the dashboard.
    return [
      { source: "/cod", destination: "/dashboard", permanent: false },
      { source: "/cod/:path*", destination: "/dashboard", permanent: false },
      { source: "/cod-:path*", destination: "/dashboard", permanent: false },
      // Stock analysis was merged into the Stock overview.
      { source: "/stock-analysis", destination: "/stock-balance/dashboard", permanent: false },
      { source: "/stock-analysis/:path*", destination: "/stock-balance/dashboard", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // The service worker must never be served from a stale HTTP cache.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
