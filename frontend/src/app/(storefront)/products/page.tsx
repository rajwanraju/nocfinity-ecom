import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { ProductGridSkeleton } from "@/components/storefront/product-grid-skeleton";
import { apiFetch } from "@/lib/api/server";
import { createCatalogApi } from "@/lib/api/catalog";
import {
  parseProductSearchParams,
  productsHref,
  type ParsedProductQuery,
} from "@/lib/api/catalog-query";
import type { Category, Pagination as PaginationMeta, ProductSummary } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Shop all products",
  description:
    "Browse the full Nocfinity collection. Filter by category and price, search the catalogue, and sort by newest or price.",
};

type SearchParams = Record<string, string | string[] | undefined>;

type ProductsPageProps = {
  searchParams: Promise<SearchParams>;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <div className="shop-container py-8 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-shop-muted uppercase">
            The collection
          </p>
          <h1 className="shop-display mt-2 text-4xl sm:text-5xl">Shop all</h1>
        </div>
        <p className="max-w-sm text-sm text-shop-muted">
          Filter by category and price, or search for a specific piece. Every price includes taxes.
        </p>
      </header>

      <Suspense fallback={<ListingSkeleton />}>
        <ProductResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type ListingData = {
  query: ParsedProductQuery;
  categories: Category[];
  products: ProductSummary[];
  pagination: PaginationMeta;
};

async function ProductResults({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const query = parseProductSearchParams(params);
  const data = await loadListing(query);

  if (!data) {
    return <ListingError query={query} />;
  }

  return <ListingContent data={data} />;
}

async function loadListing(query: ParsedProductQuery): Promise<ListingData | null> {
  const catalog = createCatalogApi(apiFetch);

  try {
    const [categories, page] = await Promise.all([
      catalog.listCategories(),
      catalog.listProducts(query),
    ]);

    return {
      query,
      categories,
      products: page.data,
      pagination: page.pagination,
    };
  } catch {
    return null;
  }
}

function ListingContent({ data }: { data: ListingData }) {
  const { query, categories, products, pagination } = data;

  return (
    <div className="space-y-8">
      <ProductFilters categories={categories} query={query} />

      {products.length === 0 ? (
        <div className="rounded-[20px] border border-shop-line px-6 py-14 text-center">
          <h2 className="text-xl font-bold">No products found</h2>
          <p className="mt-2 text-sm text-shop-muted">
            Try a different search, category, or price range.
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-shop-ink px-6 text-sm font-semibold text-background"
            href="/products"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-shop-muted">
            <p aria-live="polite">
              Showing {products.length} of {pagination.total} products
            </p>
            <p>
              Page {pagination.current_page} of {pagination.last_page}
            </p>
          </div>
          <ProductGrid products={products} priority />
          <Pagination
            buildHref={(nextPage) => productsHref({ ...query, page: nextPage })}
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
          />
        </>
      )}
    </div>
  );
}

function ListingError({ query }: { query: ParsedProductQuery }) {
  return (
    <div className="rounded-[20px] border border-shop-line px-6 py-14 text-center">
      <h2 className="text-xl font-bold">We could not load the collection</h2>
      <p className="mt-2 text-sm text-shop-muted">
        The catalogue service is unavailable right now. Please try again.
      </p>
      <Link
        className="mt-5 inline-flex h-11 items-center rounded-full border border-shop-line px-6 text-sm font-semibold"
        href={productsHref(query)}
      >
        Retry
      </Link>
    </div>
  );
}

function ProductFilters({
  categories,
  query,
}: {
  categories: Category[];
  query: ParsedProductQuery;
}) {
  return (
    <form
      action="/products"
      className="rounded-[20px] border border-shop-line p-4 sm:p-5"
      method="get"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1.5 block text-xs font-semibold" htmlFor="filter-search">
            Search
          </label>
          <input
            className="h-11 w-full rounded-full border border-input bg-transparent px-4 text-sm"
            defaultValue={query.search ?? ""}
            id="filter-search"
            name="search"
            placeholder="Dresses, silk, NOC-0001…"
            type="search"
          />
        </div>

        <div className="min-w-[160px]">
          <label className="mb-1.5 block text-xs font-semibold" htmlFor="filter-category">
            Category
          </label>
          <select
            className="h-11 w-full rounded-full border border-input bg-transparent px-4 text-sm"
            defaultValue={query.category ?? ""}
            id="filter-category"
            name="category"
          >
            <option value="">All categories</option>
            {flattenCategories(categories).map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold" htmlFor="filter-min">
            Min $
          </label>
          <input
            className="h-11 w-24 rounded-full border border-input bg-transparent px-4 text-sm"
            defaultValue={query.minPrice !== undefined ? query.minPrice / 100 : ""}
            id="filter-min"
            inputMode="decimal"
            min="0"
            name="min"
            step="0.01"
            type="number"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold" htmlFor="filter-max">
            Max $
          </label>
          <input
            className="h-11 w-24 rounded-full border border-input bg-transparent px-4 text-sm"
            defaultValue={query.maxPrice !== undefined ? query.maxPrice / 100 : ""}
            id="filter-max"
            inputMode="decimal"
            min="0"
            name="max"
            step="0.01"
            type="number"
          />
        </div>

        <div className="min-w-[170px]">
          <label className="mb-1.5 block text-xs font-semibold" htmlFor="filter-sort">
            Sort
          </label>
          <select
            className="h-11 w-full rounded-full border border-input bg-transparent px-4 text-sm"
            defaultValue={query.sort}
            id="filter-sort"
            name="sort"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex h-11 items-center gap-2 rounded-full border border-shop-line px-4 text-sm font-medium">
          <input
            className="size-4 accent-shop-ink"
            defaultChecked={query.onSale}
            name="on_sale"
            type="checkbox"
            value="1"
          />
          On sale only
        </label>

        <button
          className="inline-flex h-11 items-center gap-2 rounded-full bg-shop-ink px-6 text-sm font-semibold text-background"
          type="submit"
        >
          <SlidersHorizontal aria-hidden="true" size={15} />
          Apply filters
        </button>

        <Link
          className="inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold underline underline-offset-4"
          href="/products"
        >
          Reset
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>
    </form>
  );
}

function flattenCategories(categories: Category[], depth = 0): Category[] {
  return categories.flatMap((category) => [
    { ...category, name: `${"— ".repeat(depth)}${category.name}` },
    ...flattenCategories(category.children, depth + 1),
  ]);
}

function ListingSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="h-24 animate-pulse rounded-[20px] bg-shop-surface" />
      <ProductGridSkeleton />
    </div>
  );
}
