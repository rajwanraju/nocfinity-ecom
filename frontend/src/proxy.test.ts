import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

beforeEach(() => {
  process.env.AUTH_COOKIE_NAME = "nocfinity_token";
  process.env.ADMIN_AUTH_COOKIE_NAME = "nocfinity_admin_token";
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.test";
  process.env.API_URL = "http://127.0.0.1:8001/api/v1";
  delete process.env.API_PUBLIC_ORIGIN;
});

function request(path: string, cookie?: string): NextRequest {
  const headers: Record<string, string> = {};

  if (cookie) {
    headers.cookie = cookie;
  }

  return new NextRequest(new URL(path, "https://shop.test"), { headers });
}

describe("proxy route guards", () => {
  it("redirects a guest from admin pages to the admin login", () => {
    const response = proxy(request("/admin/orders?status=paid"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://shop.test/admin/login?next=%2Fadmin%2Forders%3Fstatus%3Dpaid",
    );
  });

  it("lets a staff session through to admin pages", () => {
    const response = proxy(request("/admin/orders", "nocfinity_admin_token=staff-token"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not accept a customer cookie for admin routes", () => {
    const response = proxy(request("/admin", "nocfinity_token=customer-token"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/admin/login");
  });

  it("protects account and checkout routes with the customer cookie", () => {
    expect(proxy(request("/account/orders")).headers.get("location")).toBe(
      "https://shop.test/login?next=%2Faccount%2Forders",
    );
    expect(proxy(request("/checkout")).headers.get("location")).toContain("/login?next=");

    const allowed = proxy(request("/account/orders", "nocfinity_token=customer-token"));
    expect(allowed.status).toBe(200);
  });

  it("keeps login pages public", () => {
    expect(proxy(request("/login")).status).toBe(200);
    expect(proxy(request("/admin/login")).status).toBe(200);
  });

  it("attaches a script-restricted CSP to every response", () => {
    const response = proxy(request("/"));
    const csp = response.headers.get("content-security-policy");

    // Partial Prerendering cannot carry a per-request nonce, so the policy
    // must allow the prerendered shell's scripts instead of blocking them.
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://js.stripe.com");
    expect(csp).not.toContain("nonce-");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("uses the public API origin in the CSP when the internal host differs", () => {
    process.env.API_URL = "http://backend:8000/api/v1";
    process.env.API_PUBLIC_ORIGIN = "http://localhost:8000";

    const csp = proxy(request("/")).headers.get("content-security-policy");

    expect(csp).toContain("img-src 'self' data: blob: http://localhost:8000");
    expect(csp).not.toContain("http://backend:8000");
  });

  it("falls back to API_URL when API_PUBLIC_ORIGIN is blank", () => {
    process.env.API_URL = "http://127.0.0.1:8001/api/v1";
    process.env.API_PUBLIC_ORIGIN = "";

    const csp = proxy(request("/")).headers.get("content-security-policy");

    expect(csp).toContain("img-src 'self' data: blob: http://127.0.0.1:8001");
    expect(csp).toContain("connect-src 'self' http://127.0.0.1:8001");
  });

  it("attaches the CSP to redirects as well as documents", () => {
    const redirect = proxy(request("/account"));

    expect(redirect.status).toBe(307);
    expect(redirect.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("upgrades insecure requests only behind HTTPS in production", () => {
    expect(proxy(request("/")).headers.get("content-security-policy")).not.toContain(
      "upgrade-insecure-requests",
    );

    const forwarded = new NextRequest(new URL("http://shop.test/"), {
      headers: { "x-forwarded-proto": "https" },
    });

    // NODE_ENV is "test" under Vitest, so transport hardening stays off.
    expect(proxy(forwarded).headers.get("content-security-policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("excludes API, static assets and images from the matcher", () => {
    expect(config.matcher).toHaveLength(1);
    const matcher = config.matcher[0];

    expect(matcher).toContain("api");
    expect(matcher).toContain("_next/static");
    expect(matcher).toContain("_next/image");
  });
});
