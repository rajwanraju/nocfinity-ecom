import type { NextConfig } from "next";

/**
 * True when `NEXT_PUBLIC_SITE_URL` is configured as plain HTTP, i.e. a local or
 * non-TLS deployment where HSTS must not be sent.
 */
function servesPlainHttp(): boolean {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").protocol === "http:";
  } catch {
    return false;
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Docker Compose serves the API on a host-published URL the optimizer
    // cannot reach from inside the container; the flag serves originals instead.
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "true",
    // Next 16 blocks private/local IPs by default (SSRF hardening). The local
    // Laravel asset host is only used outside production, so keep the default
    // protection in production builds.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8001",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8001",
        pathname: "/storage/**",
      },
    ],
  },
  async headers() {
    // These static headers apply to every route, assets included; the CSP is
    // per-request and therefore lives in `src/proxy.ts`.
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        // `payment` is delegated to Stripe.js so wallet / Payment Request flows
        // (Apple Pay, Google Pay) are allowed to run inside the payment frame.
        value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
      },
      {
        // `same-origin` would sever the wallet popup's `window.opener` link to
        // Stripe.js; allow-popups keeps the isolation for everything else.
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin-allow-popups",
      },
    ];

    // SEC-8: HSTS only where HTTPS is actually served. An explicitly configured
    // plain-HTTP site URL (local production build) must not pin HSTS.
    if (process.env.NODE_ENV === "production" && !servesPlainHttp()) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
