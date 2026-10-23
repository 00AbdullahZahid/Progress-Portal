import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * CSP notes: Next.js injects inline bootstrap scripts/styles and the app uses
 * a small inline theme script plus inline `style` attributes (avatars, progress
 * bars), so `'unsafe-inline'` is required for script/style. We still lock down
 * everything else: no framing, no object embeds, and network access limited to
 * same-origin (the chat poll) and the Postgres connection (not http).
 */
const CSP = [
  "default-src 'self'",
  // Inline is needed for Next's hydration bootstrap and the theme script.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // User uploads are served from Vercel Blob.
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to everything, including API routes and static assets.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
