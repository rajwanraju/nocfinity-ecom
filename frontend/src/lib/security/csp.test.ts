import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("locks scripts to a per-request nonce and forbids framing", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "abc123",
      isDev: false,
      apiOrigin: "http://127.0.0.1:8001",
    });

    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("connect-src 'self' http://127.0.0.1:8001 https://api.stripe.com");
    expect(csp).toContain("img-src 'self' data: blob: http://127.0.0.1:8001");
    expect(csp).toContain("frame-src https://js.stripe.com https://hooks.stripe.com");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows React eval only in development", () => {
    expect(
      buildContentSecurityPolicy({
        nonce: "n",
        isDev: true,
        apiOrigin: "http://localhost:8000",
      }),
    ).toContain("'unsafe-eval'");
  });

  it("does not add a second origin when the API URL is missing", () => {
    const csp = buildContentSecurityPolicy({ nonce: "n", isDev: false, apiOrigin: null });

    expect(csp).toContain("connect-src 'self' https://api.stripe.com");
    expect(csp).not.toContain("null");
  });
});
