import { describe, expect, it, vi } from "vitest";
import { createAdminProxyHandler } from "./handlers";

const BASE = "http://api.test/api/v1";

function request(
  path = "/api/admin/products",
  init: RequestInit & { cookie?: string } = {},
): Request {
  const headers = new Headers(init.headers);
  headers.set("cookie", init.cookie ?? "nocfinity_admin_token=staff-token");

  return new Request(`http://shop.test${path}`, { ...init, headers });
}

function respond(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("admin BFF proxy", () => {
  it("requires a staff session cookie", async () => {
    const call = vi.fn<typeof fetch>();
    const response = await createAdminProxyHandler({ baseUrl: BASE, fetchImpl: call })(
      request("/api/admin/products", { cookie: "" }),
      ["products"],
    );

    expect(response.status).toBe(401);
    expect(call).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations before calling the API", async () => {
    const call = vi.fn<typeof fetch>();
    const response = await createAdminProxyHandler({
      baseUrl: BASE,
      fetchImpl: call,
      siteUrl: "http://shop.test",
    })(
      request("/api/admin/products/1", {
        method: "PATCH",
        headers: { origin: "https://evil.test", "content-type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      }),
      ["products", "1"],
    );

    expect(response.status).toBe(403);
    expect(call).not.toHaveBeenCalled();
  });

  it("forwards reads with the staff bearer and query string", async () => {
    const call = vi.fn<typeof fetch>(async () =>
      respond({ success: true, message: "OK", data: [{ id: 1 }], meta: null, errors: null }),
    );
    const response = await createAdminProxyHandler({ baseUrl: BASE, fetchImpl: call })(
      request("/api/admin/products?search=dress&page=2"),
      ["products"],
    );

    expect(call).toHaveBeenCalledTimes(1);

    const [url, init] = call.mock.calls[0] ?? [];
    const target = new URL(String(url));

    expect(target.origin).toBe("http://api.test");
    expect(target.pathname).toBe("/api/v1/admin/products");
    expect(target.searchParams.get("search")).toBe("dress");
    expect(target.searchParams.get("page")).toBe("2");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer staff-token");
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([{ id: 1 }]);
  });

  it("forwards multipart uploads without re-encoding the body", async () => {
    const call = vi.fn<typeof fetch>(async (_url, init) => {
      expect(new Headers(init?.headers).get("content-type")).toBe(
        "multipart/form-data; boundary=xyz",
      );
      expect(init?.body).toBeInstanceOf(ArrayBuffer);

      return respond({ success: true, message: "Image uploaded.", data: { id: 3 } }, 201);
    });
    const response = await createAdminProxyHandler({ baseUrl: BASE, fetchImpl: call })(
      request("/api/admin/products/1/images", {
        method: "POST",
        headers: {
          origin: "http://shop.test",
          "content-type": "multipart/form-data; boundary=xyz",
        },
        body: "image-bytes",
      }),
      ["products", "1", "images"],
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ message: "Image uploaded." });
  });

  it("passes backend errors through and clears an expired staff session", async () => {
    const call = vi.fn<typeof fetch>(async () =>
      respond(
        { success: false, message: "Unauthenticated.", data: null, meta: null, errors: null },
        401,
      ),
    );
    const response = await createAdminProxyHandler({ baseUrl: BASE, fetchImpl: call })(
      request("/api/admin/profile"),
      ["profile"],
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await response.json()).message).toBe("Unauthenticated.");
  });
});
