import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [],
  redirects: async () => [
    // Login was consolidated into a single TSC-based /login for every role —
    // keep old bookmarks/links to the retired admin-only sign-in working.
    { source: "/admin-login", destination: "/login", permanent: true },
  ],
  headers: async () => {
    // Skip restrictive security headers in dev so the preview iframe can load
    if (process.env.NODE_ENV === "development") {
      return [];
    }
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
