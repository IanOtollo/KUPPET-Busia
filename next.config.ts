import type { NextConfig } from "next";

// Content-Security-Policy. Sign-in tokens live in localStorage, so a script
// injection would mean account takeover — this restricts what the page may load
// and where it may talk to. Next.js needs inline scripts/styles to hydrate.
const convexOrigin = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(/\/$/, "");
const convexWs = convexOrigin.replace(/^http/, "ws");
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${convexOrigin} ${convexWs} https://*.convex.cloud wss://*.convex.cloud https://*.convex.site`.trim(),
  "img-src 'self' data: blob: https://*.convex.cloud",
  "media-src 'self' blob: https://*.convex.cloud",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

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
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
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
