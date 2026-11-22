import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("allows only same-origin, inline bootstrap and Stripe scripts, and forbids framing", () => {
    const csp = buildContentSecurityPolicy({
      isDev: false,
      apiOrigin: "http://127.0.0.1:8001",
    });

    // A nonce/strict-dynamic policy is incompatible with the prerendered
    // shell (Partial Prerendering), so scripts rely on same-origin + inline.
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://js.stripe.com");
    expect(csp).not.toContain("nonce-");
    expect(csp).not.toContain("strict-dynamic");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("connect-src 'self' http://127.0.0.1:8001 https://api.stripe.com");
    expect(csp).toContain("img-src 'self' data: blob: http://127.0.0.1:8001");
    expect(csp).toContain(
      "frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",
    );
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows React eval only in development", () => {
    expect(
      buildContentSecurityPolicy({ isDev: true, apiOrigin: "http://localhost:8000" }),
    ).toContain("'unsafe-eval'");
  });

  it("does not add a second origin when the API URL is missing", () => {
    const csp = buildContentSecurityPolicy({ isDev: false, apiOrigin: null });

    expect(csp).toContain("connect-src 'self' https://api.stripe.com");
    expect(csp).not.toContain("null");
  });

  it("grants only the Stripe hosts the payment element needs", () => {
    const csp = buildContentSecurityPolicy({ isDev: false, apiOrigin: null });

    expect(csp).toContain("https://errors.stripe.com");
    expect(csp).toContain("https://r.stripe.com");
    expect(csp).toContain("img-src 'self' data: blob: https://*.stripe.com");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("form-action 'self'");
  });

  it("only upgrades insecure requests when the app is served over HTTPS", () => {
    expect(buildContentSecurityPolicy({ isDev: false, apiOrigin: null, secure: true })).toContain(
      "upgrade-insecure-requests",
    );
    expect(
      buildContentSecurityPolicy({ isDev: false, apiOrigin: null, secure: false }),
    ).not.toContain("upgrade-insecure-requests");
  });
});
