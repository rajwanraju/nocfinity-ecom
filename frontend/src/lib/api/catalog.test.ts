import { describe, expect, it } from "vitest";
import type { ApiEnvelope } from "@/lib/api/server";
import {
  createCatalogApi,
  parseProductSearchParams,
  productQueryToSearchParams,
  type CatalogListenerApi,
} from "./catalog";

type Call = { path: string; options: Parameters<CatalogListenerApi>[1] };

function envelope<T>(data: T, meta: ApiEnvelope<T>["meta"] = null): ApiEnvelope<T> {
  return { success: true, message: "OK", data, meta, errors: null };
}

describe("createCatalogApi", () => {
  it("maps friendly filters onto the API query and defaults per_page", async () => {
    const calls: Call[] = [];
    const api = createCatalogApi(async (path, options) => {
      calls.push({ path, options });
      return envelope([], {
        pagination: { current_page: 2, per_page: 12, total: 0, last_page: 1 },
      });
    });

    const result = await api.listProducts({
      search: "  silk  ",
      category: "dresses",
      minPrice: 5000,
      maxPrice: 20000,
      sort: "price_asc",
      page: 2,
    });

    expect(calls[0]).toEqual({
      path: "/products",
      options: {
        query: {
          search: "silk",
          category: "dresses",
          min_price: 5000,
          max_price: 20000,
          sort: "price_asc",
          page: 2,
          per_page: 12,
        },
      },
    });
    expect(result.pagination.current_page).toBe(2);
  });

  it("omits empty filters and falls back to page one", async () => {
    const calls: Call[] = [];
    const api = createCatalogApi(async (path, options) => {
      calls.push({ path, options });
      return envelope([]);
    });

    const result = await api.listProducts({ search: "   ", page: 0 });

    expect(calls[0].options?.query).toEqual({ sort: "newest", page: 1, per_page: 12 });
    expect(result.pagination).toEqual({ current_page: 1, per_page: 12, total: 0, last_page: 1 });
  });

  it("loads a product by slug", async () => {
    const calls: Call[] = [];
    const api = createCatalogApi(async (path, options) => {
      calls.push({ path, options });
      return envelope({ id: 1, slug: "dress" });
    });

    await api.getProduct("dress");

    expect(calls[0]).toEqual({ path: "/products/dress", options: undefined });
  });
});

describe("parseProductSearchParams", () => {
  it("parses filters from the URL, converting dollars to cents", () => {
    expect(
      parseProductSearchParams({
        search: " silk ",
        category: "dresses",
        min: "50",
        max: "200.50",
        on_sale: "1",
        sort: "price_desc",
        page: "3",
      }),
    ).toEqual({
      search: "silk",
      category: "dresses",
      minPrice: 5000,
      maxPrice: 20050,
      onSale: true,
      sort: "price_desc",
      page: 3,
      perPage: 12,
    });
  });

  it("ignores invalid values", () => {
    expect(
      parseProductSearchParams({
        search: "x".repeat(200),
        sort: "popular",
        min: "-5",
        max: "oops",
        page: "0",
        on_sale: "yes",
      }),
    ).toEqual({ onSale: false, sort: "newest", page: 1, perPage: 12 });
  });

  it("drops a max below the min", () => {
    expect(parseProductSearchParams({ min: "100", max: "50" })).toEqual({
      minPrice: 10000,
      onSale: false,
      sort: "newest",
      page: 1,
      perPage: 12,
    });
  });
});

describe("productQueryToSearchParams", () => {
  it("serialises filters back to the storefront URL", () => {
    expect(
      productQueryToSearchParams({
        search: "silk",
        category: "dresses",
        minPrice: 5000,
        maxPrice: 20050,
        onSale: true,
        sort: "price_asc",
        page: 2,
      }).toString(),
    ).toBe("search=silk&category=dresses&min=50&max=200.5&on_sale=1&sort=price_asc&page=2");
  });
});
