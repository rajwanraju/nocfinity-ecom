import "server-only";

import type { ApiEnvelope, ApiRequestOptions } from "@/lib/api/server";
import { DEFAULT_PAGE_SIZE, type ParsedProductQuery, type ProductQuery } from "./catalog-query";
import type { Category, Pagination, Product, ProductSummary } from "./types";

export type CatalogListenerApi = (
  path: string,
  options?: ApiRequestOptions,
) => Promise<ApiEnvelope<unknown>>;

export type ProductPage = {
  data: ProductSummary[];
  pagination: Pagination;
};

export type CatalogApi = {
  listCategories: () => Promise<Category[]>;
  listProducts: (query?: ProductQuery) => Promise<ProductPage>;
  getProduct: (slug: string) => Promise<Product>;
};

const EMPTY_PAGINATION: Pagination = {
  current_page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  total: 0,
  last_page: 1,
};

/**
 * Server-side catalog reads. Filters arrive already validated from the URL
 * parser; empty values are dropped rather than sent as blank parameters.
 */
export function createCatalogApi(api: CatalogListenerApi): CatalogApi {
  return {
    async listCategories() {
      const result = (await api("/categories")) as ApiEnvelope<Category[]>;

      return Array.isArray(result.data) ? result.data : [];
    },

    async listProducts(query = {}) {
      const page = query.page && query.page > 0 ? query.page : 1;
      const params: Record<string, string | number> = {
        sort: query.sort ?? "newest",
        page,
        per_page: query.perPage ?? DEFAULT_PAGE_SIZE,
      };

      if (query.search?.trim()) {
        params.search = query.search.trim();
      }

      if (query.category?.trim()) {
        params.category = query.category.trim();
      }

      if (query.minPrice !== undefined) {
        params.min_price = query.minPrice;
      }

      if (query.maxPrice !== undefined) {
        params.max_price = query.maxPrice;
      }

      if (query.onSale) {
        params.on_sale = 1;
      }

      const result = (await api("/products", { query: params })) as ApiEnvelope<ProductSummary[]>;

      return {
        data: Array.isArray(result.data) ? result.data : [],
        pagination: result.meta?.pagination ?? EMPTY_PAGINATION,
      };
    },

    async getProduct(slug) {
      const result = (await api(`/products/${encodeURIComponent(slug)}`)) as ApiEnvelope<Product>;

      return result.data;
    },
  };
}

export function productQueryFromParsed(query: ParsedProductQuery): ProductQuery {
  return { ...query };
}

export {
  parseProductSearchParams,
  productQueryToSearchParams,
  productsHref,
} from "./catalog-query";
