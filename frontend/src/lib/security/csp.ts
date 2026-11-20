export type CspOptions = {
  nonce: string;
  isDev: boolean;
  apiOrigin: string | null;
};

/**
 * P8/P12: strict script CSP with a per-request nonce (Next injects the nonce
 * into its own scripts through the `x-nonce` request header). Inline styles are
 * allowed because Tailwind and base-ui emit style attributes; scripts are not.
 */
export function buildContentSecurityPolicy({ nonce, isDev, apiOrigin }: CspOptions): string {
  const api = apiOrigin ? ` ${apiOrigin}` : "";
  const evalSource = isDev ? " 'unsafe-eval'" : "";
  const directives = [
    "default-src 'self'",
    // Stripe.js must load from its CDN; it loads no further scripts (SEC-12).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${evalSource}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${api}`,
    "font-src 'self' data:",
    `connect-src 'self'${api} https://api.stripe.com`,
    "frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}
