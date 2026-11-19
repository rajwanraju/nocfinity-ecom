import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiEnvelope } from "@/lib/api/server";
import { ApiError } from "@/lib/api/server";
import { createLoginHandler, createLogoutHandler, createMeHandler } from "./handlers";

const user = {
  id: 12,
  name: "Ada Customer",
  email: "ada@example.test",
  phone: null,
  type: "customer" as const,
  is_active: true,
  email_verified_at: null,
  created_at: "2026-01-01T00:00:00+00:00",
};

function envelope<T>(data: T, message = "OK"): ApiEnvelope<T> {
  return { success: true, message, data, meta: null, errors: null };
}

function loginRequest(body: unknown, origin = "https://shop.test"): Request {
  return new Request("https://shop.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function cookieFrom(response: Response): string {
  return response.headers.get("set-cookie") ?? "";
}

beforeEach(() => {
  process.env.AUTH_COOKIE_NAME = "nocfinity_token";
  process.env.ADMIN_AUTH_COOKIE_NAME = "nocfinity_admin_token";
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.test";
  process.env.COOKIE_SECURE = "false";
});

describe("customer login BFF", () => {
  it("stores the token in an httpOnly cookie and never returns it", async () => {
    const api = vi.fn().mockResolvedValue(
      envelope({
        user,
        token: "secret-token",
        token_type: "Bearer",
        abilities: ["customer"],
      }),
    );
    const handler = createLoginHandler("customer", { api });

    const response = await handler(
      loginRequest({ email: "ada@example.test", password: "Password123!" }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain("secret-token");
    expect(JSON.parse(body)).toMatchObject({
      success: true,
      data: { user: { id: 12 }, abilities: ["customer"] },
    });
    expect(api).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: { email: "ada@example.test", password: "Password123!" },
      }),
    );

    const cookie = cookieFrom(response);
    expect(cookie).toContain("nocfinity_token=secret-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("uses the admin cookie name for staff login", async () => {
    const api = vi.fn().mockResolvedValue(
      envelope({
        user: { ...user, type: "staff", roles: ["Super Admin"], permissions: ["orders.view"] },
        token: "staff-token",
        token_type: "Bearer",
        abilities: ["staff"],
      }),
    );
    const handler = createLoginHandler("staff", { api });

    const response = await handler(
      loginRequest({ email: "admin@example.test", password: "Password123!" }),
    );

    expect(cookieFrom(response)).toContain("nocfinity_admin_token=staff-token");
    expect(cookieFrom(response)).not.toContain("nocfinity_token=staff-token");
  });

  it("marks the cookie Secure when COOKIE_SECURE is true", async () => {
    process.env.COOKIE_SECURE = "true";
    const api = vi
      .fn()
      .mockResolvedValue(
        envelope({ user, token: "t", token_type: "Bearer", abilities: ["customer"] }),
      );

    const response = await createLoginHandler("customer", { api })(
      loginRequest({ email: "ada@example.test", password: "Password123!" }),
    );

    expect(cookieFrom(response)).toContain("Secure");
  });

  it("forwards validation errors and status from the API", async () => {
    const api = vi.fn().mockRejectedValue(
      new ApiError("Invalid credentials.", 422, {
        email: ["These credentials do not match our records."],
      }),
    );

    const response = await createLoginHandler("customer", { api })(
      loginRequest({ email: "ada@example.test", password: "wrong" }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: "Invalid credentials.",
      errors: { email: ["These credentials do not match our records."] },
    });
  });

  it("forwards Retry-After when the API throttles the login", async () => {
    const api = vi.fn().mockRejectedValue(new ApiError("Too many attempts.", 429));
    const handler = createLoginHandler("customer", { api });
    const response = await handler(loginRequest({ email: "ada@example.test", password: "wrong" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("rejects a cross-origin login before calling the API", async () => {
    const api = vi.fn();

    const response = await createLoginHandler("customer", { api })(
      loginRequest({ email: "ada@example.test", password: "Password123!" }, "https://evil.test"),
    );

    expect(response.status).toBe(403);
    expect(api).not.toHaveBeenCalled();
  });

  it("requires an email and password", async () => {
    const api = vi.fn();

    const response = await createLoginHandler("customer", { api })(
      loginRequest({ email: "not-an-email" }),
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.errors).toHaveProperty("email");
    expect(body.errors).toHaveProperty("password");
    expect(api).not.toHaveBeenCalled();
  });

  it("rejects a malformed JSON body", async () => {
    const api = vi.fn();
    const request = new Request("https://shop.test/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://shop.test" },
      body: "{not json",
    });

    const response = await createLoginHandler("customer", { api })(request);

    expect(response.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });
});

describe("me and logout BFF", () => {
  it("returns 401 without a session cookie", async () => {
    const api = vi.fn();
    const response = await createMeHandler("customer", { api })(
      new Request("https://shop.test/api/auth/me"),
    );

    expect(response.status).toBe(401);
    expect(api).not.toHaveBeenCalled();
  });

  it("returns the current user and forwards the bearer token", async () => {
    const api = vi.fn().mockResolvedValue(envelope(user));
    const request = new Request("https://shop.test/api/auth/me", {
      headers: { cookie: "theme=dark; nocfinity_token=abc123" },
    });

    const response = await createMeHandler("customer", { api })(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: { id: 12 } });
    expect(api).toHaveBeenCalledWith("/auth/me", expect.objectContaining({ token: "abc123" }));
  });

  it("clears a stale cookie when the API rejects the token", async () => {
    const api = vi.fn().mockRejectedValue(new ApiError("Unauthenticated.", 401));
    const request = new Request("https://shop.test/api/auth/me", {
      headers: { cookie: "nocfinity_token=stale" },
    });

    const response = await createMeHandler("customer", { api })(request);

    expect(response.status).toBe(401);
    expect(cookieFrom(response)).toContain("nocfinity_token=");
    expect(cookieFrom(response)).toContain("Max-Age=0");
  });

  it("clears the cookie on logout even when the API call fails", async () => {
    const api = vi.fn().mockRejectedValue(new ApiError("Unavailable.", 503));
    const request = new Request("https://shop.test/api/auth/logout", {
      method: "POST",
      headers: { cookie: "nocfinity_token=abc123", origin: "https://shop.test" },
    });

    const response = await createLogoutHandler("customer", { api })(request);

    expect(response.status).toBe(200);
    expect(api).toHaveBeenCalledWith("/auth/logout", expect.objectContaining({ method: "POST" }));
    expect(cookieFrom(response)).toContain("Max-Age=0");
    expect(cookieFrom(response)).toContain("HttpOnly");
  });
});
