
export type CspOptions = {
  nonce: string;
  isDev: boolean;
  apiOrigin: string | null;
};

/**
 * Builds a nonce-based Content Security Policy.
 *
 * Security:
 * - Scripts require an authorized nonce or an explicitly trusted source.
 * - Inline styles are allowed for Tailwind and UI component compatibility.
 * - API connections are restricted to the configured API origin.
 * - Stripe resources are explicitly allowlisted.
 */
export function buildContentSecurityPolicy({
  nonce,
  isDev,
  apiOrigin,
}: CspOptions): string {
  const apiSources = apiOrigin ? ` ${apiOrigin}` : "";

  const directives = [
    // Default policy
    "default-src 'self'",

    // Scripts: nonce-based execution and explicitly trusted Stripe CDN.
    // strict-dynamic is intentionally omitted so host allowlisting works.
    [
      "script-src",
      "'self'",
      `'nonce-${nonce}'`,
      "https://js.stripe.com",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ].join(" "),

    // Styles
    "style-src 'self' 'unsafe-inline'",

    // Images, including Laravel-hosted storage assets
    `img-src 'self' data: blob:${apiSources}`,

    // Fonts
    "font-src 'self' data:",

    // API requests and Stripe connections
    [
      "connect-src",
      "'self'",
      apiSources.trim(),
      "https://api.stripe.com",
      "https://m.stripe.network",
    ]
      .filter(Boolean)
      .join(" "),

    // Stripe payment frames
    [
      "frame-src",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://m.stripe.network",
    ].join(" "),

    // Restrict embedded objects
    "object-src 'none'",

    // Restrict base URL
    "base-uri 'self'",

    // Restrict form submissions
    "form-action 'self'",

    // Prevent this application from being embedded
    "frame-ancestors 'none'",

    // Upgrade insecure requests in production
    ...(!isDev ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}
