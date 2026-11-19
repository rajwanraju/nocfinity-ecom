import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./server";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const envelope = {
  success: true,
  message: "OK",
  data: { id: 7, name: "Tee" },
  meta: null,
  errors: null,
};

describe("createApiClient", () => {
  it("joins the base URL and parses the envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(envelope));
    const api = createApiClient({ baseUrl: "http://api.test/api/v1/", fetchImpl });

    const result = await api<{ id: number; name: string }>("/products/7");

    expect(result.data).toEqual({ id: 7, name: "Tee" });
    expect(result.success).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/products/7",
      expect.objectContaining({ method: "GET" }),
    );
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Accept: "application/json" });
    expect(init.body).toBeUndefined();
  });

  it("serialises query params and omits empty values", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ...envelope, data: [] }));
    const api = createApiClient({ baseUrl: "http://api.test/api/v1", fetchImpl });

    await api("/products", {
      query: { search: "black tee", page: 2, per_page: undefined, featured: false },
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "http://api.test/api/v1/products?search=black+tee&page=2&featured=false",
    );
  });

  it("sends bearer, cart token and a JSON body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ...envelope, data: null }));
    const api = createApiClient({ baseUrl: "http://api.test/api/v1", fetchImpl });

    await api("/cart/items", {
      method: "POST",
      body: { product_id: 3, quantity: 2 },
      token: "customer-token",
      cartToken: "guest-cart",
    });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];

    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer customer-token",
      "X-Cart-Token": "guest-cart",
    });
    expect(init.body).toBe(JSON.stringify({ product_id: 3, quantity: 2 }));
  });

  it("throws an ApiError carrying validation errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          success: false,
          message: "The given data was invalid.",
          data: null,
          meta: null,
          errors: { email: ["The email has already been taken."] },
        },
        422,
      ),
    );
    const api = createApiClient({ baseUrl: "http://api.test/api/v1", fetchImpl });

    const promise = api("/auth/register", { method: "POST", body: {} });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 422,
      message: "The given data was invalid.",
      errors: { email: ["The email has already been taken."] },
    });
  });

  it("returns a null data envelope for 204 responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: "http://api.test/api/v1", fetchImpl });

    const result = await api<null>("/admin/coupons/1", { method: "DELETE", token: "staff" });

    expect(result).toEqual({
      success: true,
      message: "",
      data: null,
      meta: null,
      errors: null,
    });
  });

  it("falls back to the HTTP status when the error body is not JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 }));
    const api = createApiClient({ baseUrl: "http://api.test/api/v1", fetchImpl });

    await expect(api("/health")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      message: "Bad gateway",
    });
  });
});
