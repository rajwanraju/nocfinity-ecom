import { describe, expect, it, vi } from "vitest";
import type { ApiEnvelope } from "@/lib/api/server";
import { ApiError } from "@/lib/api/server";
import { cartCookie, clearedCartCookie, readCartToken } from "./cookies";
import { handleCartRequest, type CartListenerApi } from "./handlers";

const cartPayload = {
  id: 7,
  is_guest: true,
  items: [],
  item_count: 0,
  coupon: null,
  totals: { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 },
};

function envelope<T>(data: T, meta: ApiEnvelope<T>["meta"] = null, message = "OK"): ApiEnvelope<T> {
  return { success: true, message, data, meta, errors: null };
}

function request(
  url = "http://shop.test/api/cart",
  init: RequestInit & { cookie?: string } = {},
): Request {
  const headers = new Headers(init.headers);
  headers.set("cookie", init.cookie ?? "");

  return new Request(url, { ...init, headers });
}

describe("cart cookies", () => {
  it("reads and writes the configured httpOnly cart cookie", () => {
    expect(cartCookie("abc-123")).toContain("nocfinity_cart=abc-123");
    expect(cartCookie("abc-123")).toContain("HttpOnly");
    expect(cartCookie("abc-123")).toContain("SameSite=Lax");
    expect(clearedCartCookie()).toContain("Max-Age=0");
    expect(readCartToken("a=1; nocfinity_cart=abc-123; b=2")).toBe("abc-123");
    expect(readCartToken(null)).toBeNull();
  });
});

describe("handleCartRequest", () => {
  it("forwards both cookies and stores the guest token from meta", async () => {
    const call = vi.fn<CartListenerApi>(async () =>
      envelope(cartPayload, { cart_token: "cart-token-1" }),
    );
    const response = await handleCartRequest(
      request(undefined, { cookie: "nocfinity_token=customer-token; nocfinity_cart=old-token" }),
      { type: "show" },
      { api: call },
    );

    expect(call).toHaveBeenCalledWith("/cart", {
      method: "GET",
      token: "customer-token",
      cartToken: "old-token",
    });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.id).toBe(7);
    expect(body.meta).toBeNull();
    expect(JSON.stringify(body)).not.toContain("cart-token-1");
    expect(response.headers.get("set-cookie")).toContain("nocfinity_cart=cart-token-1");
  });

  it("rejects cross-origin mutations before calling the API", async () => {
    const call = vi.fn<CartListenerApi>();
    const response = await handleCartRequest(
      request(undefined, {
        method: "POST",
        headers: { origin: "https://evil.test", "content-type": "application/json" },
        body: JSON.stringify({ product_id: 1, quantity: 1 }),
      }),
      { type: "add" },
      { api: call },
    );

    expect(response.status).toBe(403);
    expect(call).not.toHaveBeenCalled();
  });

  it("validates the add-to-cart body", async () => {
    const call = vi.fn<CartListenerApi>();
    const response = await handleCartRequest(
      request(undefined, {
        method: "POST",
        headers: { origin: "http://shop.test", "content-type": "application/json" },
        body: JSON.stringify({ product_id: "nope", quantity: 0 }),
      }),
      { type: "add" },
      { api: call },
    );

    expect(response.status).toBe(422);
    expect(call).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.errors.product_id).toBeTruthy();
    expect(body.errors.quantity).toBeTruthy();
  });

  it("sends validated mutations to the item endpoint", async () => {
    const call = vi.fn<CartListenerApi>(async () => envelope(cartPayload));
    const response = await handleCartRequest(
      request(undefined, {
        method: "PATCH",
        headers: { origin: "http://shop.test", "content-type": "application/json" },
        body: JSON.stringify({ quantity: 3 }),
      }),
      { type: "update", itemId: "42" },
      { api: call },
    );

    expect(response.status).toBe(200);
    expect(call).toHaveBeenCalledWith("/cart/items/42", {
      method: "PATCH",
      token: null,
      cartToken: null,
      body: { quantity: 3 },
    });
  });

  it("maps backend validation errors and rate limits", async () => {
    const validation = vi.fn<CartListenerApi>(async () => {
      throw new ApiError("Only 2 units are available.", 422, { quantity: ["Too many."] });
    });
    const validationResponse = await handleCartRequest(
      request(undefined, {
        method: "POST",
        headers: { origin: "http://shop.test", "content-type": "application/json" },
        body: JSON.stringify({ code: "WELCOME10" }),
      }),
      { type: "apply-coupon" },
      { api: validation },
    );

    expect(validationResponse.status).toBe(422);
    expect((await validationResponse.json()).errors.quantity).toEqual(["Too many."]);

    const limited = vi.fn<CartListenerApi>(async () => {
      throw new ApiError("Too many attempts.", 429, null, null, "90");
    });
    const limitedResponse = await handleCartRequest(
      request(undefined, {
        method: "POST",
        headers: { origin: "http://shop.test", "content-type": "application/json" },
        body: JSON.stringify({ code: "WELCOME10" }),
      }),
      { type: "apply-coupon" },
      { api: limited },
    );

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get("retry-after")).toBe("90");
  });

  it("returns 204 for a clear without a body", async () => {
    const call = vi.fn<CartListenerApi>(async () => ({
      success: true,
      message: "",
      data: null as never,
      meta: null,
      errors: null,
    }));
    const response = await handleCartRequest(
      request(undefined, { method: "DELETE", headers: { origin: "http://shop.test" } }),
      { type: "clear" },
      { api: call },
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
