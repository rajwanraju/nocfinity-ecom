export type CspOptions = {
  isDev: boolean;
  apiOrigin: string | null;
  /** True when the app is served over HTTPS. Defaults to the inverse of `isDev`. */
  secure?: boolean;
};

/**
 * Content Security Policy for the storefront.
 *
 * Scripts are NOT nonce-based. This app enables `cacheComponents` (Partial
 * Prerendering), which serves a cached shell whose inline bootstrap scripts and
 * framework <script src> tags are produced at build time and therefore cannot
 * carry a per-request nonce. Next.js documents that PPR is incompatible with
 * nonce-based CSP (`node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md`); shipping a nonce (or `'strict-dynamic'`) makes
 * the browser block those scripts, so hydration, client-side navigation, the
 * login form and add-to-cart all silently stop working.
 *
 * The policy therefore restricts scripts to same-origin files, the inline
 * bootstrap Next.js emits for the prerendered shell, and the Stripe CDN, and
 * grants the narrow set of Stripe hosts required by Stripe.js, the Payment
 * Element iframe and its telemetry. Inline styles are required by Tailwind and
 * by the component library's runtime style injection.
 *
 * Host list reference: https://docs.stripe.com/security/guide#content-security-policy
 */
const STRIPE_SCRIPT_SRC = "https://js.stripe.com";
const STRIPE_FRAME_SRC = ["https://js.stripe.com", "https://hooks.stripe.com", "https://m.stripe.network"];
const STRIPE_CONNECT_SRC = [
  "https://api.stripe.com",
  "https://errors.stripe.com",
  "https://m.stripe.network",
  "https://r.stripe.com",
];

function list(...values: (string | undefined)[]): string {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].join(" ");
}

export function buildContentSecurityPolicy({
  isDev,
  apiOrigin,
  secure = !isDev,
}: CspOptions): string {
  const directives = [
    "default-src 'self'",

    // `'unsafe-inline'` covers the prerendered shell's bootstrap scripts; it is
    // scoped to this origin plus `js.stripe.com`, so third-party hosts cannot
    // inject executable script.
    list("script-src 'self' 'unsafe-inline'", STRIPE_SCRIPT_SRC, isDev ? "'unsafe-eval'" : undefined),

    "style-src 'self' 'unsafe-inline'",

    // Product images served by the API plus Stripe's card-brand assets.
    list("img-src 'self' data: blob:", apiOrigin ?? undefined, "https://*.stripe.com"),

    "font-src 'self' data:",

    // The browser only calls this origin (the BFF) and Stripe. `m.stripe.network`
    // backs the Payment Element's frame messaging, `r`/`errors` are telemetry.
    list("connect-src 'self'", apiOrigin ?? undefined, ...STRIPE_CONNECT_SRC),

    list("frame-src", ...STRIPE_FRAME_SRC),

    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",

    // Only meaningful (and only harmless) when the app itself is served over
    // HTTPS; emitting it behind plain HTTP would upgrade same-origin asset and
    // API requests to a port that may not speak TLS.
    ...(secure ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

