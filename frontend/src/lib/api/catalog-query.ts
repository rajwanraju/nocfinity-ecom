export type ProductSort = "newest" | "price_asc" | "price_desc";

export type ProductQuery = {
  search?: string;
  category?: string;
  /** Effective price in cents. */
  minPrice?: number;
  /** Effective price in cents. */
  maxPrice?: number;
  /** Only products whose discount is currently active. */
  onSale?: boolean;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

export type ParsedProductQuery = ProductQuery & {
  sort: ProductSort;
  page: number;
  perPage: number;
};

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 60;

const SORTS: ProductSort[] = ["newest", "price_asc", "price_desc"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cleanText(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed || trimmed.length > max) {
    return undefined;
  }

  return trimmed;
}

function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Storefront prices are entered in dollars; the API always receives cents. */
function parseDollars(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return undefined;
  }

  return Math.round(amount * 100);
}

/**
 * URL is the source of truth for listing filters (FR-CAT-3). Unknown or
 * invalid values fall back to safe defaults instead of reaching the API.
 */
export function parseProductSearchParams(
  params: Record<string, string | string[] | undefined>,
): ParsedProductQuery {
  const minPrice = parseDollars(first(params.min));
  let maxPrice = parseDollars(first(params.max));

  if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
    maxPrice = undefined;
  }

  const requestedSort = first(params.sort) as ProductSort | undefined;
  const onSale = first(params.on_sale);

  return {
    search: cleanText(first(params.search), 100),
    category: cleanText(first(params.category), 255),
    minPrice,
    maxPrice,
    onSale: onSale === "1" || onSale === "true",
    sort: requestedSort && SORTS.includes(requestedSort) ? requestedSort : "newest",
    page: parsePage(first(params.page)),
    perPage: DEFAULT_PAGE_SIZE,
  };
}

/** Serialises filters for pagination/filter links, keeping dollars in the URL. */
export function productQueryToSearchParams(query: ProductQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.category) {
    params.set("category", query.category);
  }

  if (query.minPrice !== undefined) {
    params.set("min", String(query.minPrice / 100));
  }

  if (query.maxPrice !== undefined) {
    params.set("max", String(query.maxPrice / 100));
  }

  if (query.onSale) {
    params.set("on_sale", "1");
  }

  if (query.sort && query.sort !== "newest") {
    params.set("sort", query.sort);
  }

  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }

  return params;
}

export function productsHref(query: ProductQuery): string {
  const params = productQueryToSearchParams(query).toString();

  return params ? `/products?${params}` : "/products";
}
