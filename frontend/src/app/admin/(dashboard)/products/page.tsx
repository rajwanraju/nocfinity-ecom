import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  AdminPageHeader,
  ApiFailure,
  EmptyState,
  PermissionNotice,
} from "@/components/admin/admin-ui";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { DeleteButton } from "@/components/admin/delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryOptionLabel, flattenCategories } from "@/lib/admin/catalog";
import { adminGet, pageParam, paramValue, type SearchParams } from "@/lib/admin/server";
import type { Category, ProductSummary } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";
import { formatMoney } from "@/lib/format/money";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        description="Create and maintain the catalogue, its pricing, stock and images."
        eyebrow="Catalog"
        title="Products"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
        <ProductsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProductsList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser("staff");
  const permissions = user?.permissions ?? [];

  if (!hasPermission(permissions, "products.view")) {
    return <PermissionNotice permission="products.view" />;
  }

  const query = await searchParams;
  const search = paramValue(query.search) ?? "";
  const status = paramValue(query.status) ?? "";
  const categoryId = paramValue(query.category_id) ?? "";
  const page = pageParam(query.page);

  const [productsResult, categoriesResult] = await Promise.all([
    adminGet<ProductSummary[]>("products", {
      search: search || undefined,
      status: status || undefined,
      category_id: categoryId || undefined,
      page,
    }),
    adminGet<Category[]>("categories"),
  ]);

  if (!productsResult.ok) {
    return <ApiFailure message={productsResult.message} />;
  }

  const products = productsResult.data;
  const pagination = productsResult.pagination;
  const categories = categoriesResult.ok ? flattenCategories(categoriesResult.data) : [];
  const canEdit = hasPermission(permissions, "products.edit");
  const canDelete = hasPermission(permissions, "products.delete");

  return (
    <div className="mt-8">
      {hasPermission(permissions, "products.create") ? (
        <div className="mb-5 flex justify-end">
          <Link
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            href="/admin/products/new"
          >
            New product
          </Link>
        </div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-shop-muted uppercase"
            htmlFor="product-search"
          >
            Search
          </label>
          <Input
            className="h-10"
            defaultValue={search}
            id="product-search"
            name="search"
            placeholder="Name, SKU or description"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-shop-muted uppercase"
            htmlFor="product-status-filter"
          >
            Status
          </label>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={status}
            id="product-status-filter"
            name="status"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {categories.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-semibold text-shop-muted uppercase"
              htmlFor="product-category-filter"
            >
              Category
            </label>
            <select
              className="h-10 max-w-56 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={categoryId}
              id="product-category-filter"
              name="category_id"
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {categoryOptionLabel(option)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button className="h-10 rounded-full px-5" type="submit">
          Filter
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-shop-muted">
        <span>
          {pagination
            ? `${pagination.total} product${pagination.total === 1 ? "" : "s"}`
            : `${products.length} products`}
        </span>
        {pagination ? (
          <span>
            Page {pagination.current_page} of {pagination.last_page}
          </span>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            description="Adjust the filters, or add the first product to the catalogue."
            title="No products match these filters"
          />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-shop-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-shop-tile">
                          {product.primary_image ? (
                            <Image
                              alt={product.primary_image.alt ?? product.name}
                              className="object-cover"
                              fill
                              sizes="40px"
                              src={product.primary_image.url}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            className="block truncate font-semibold underline-offset-2 hover:underline"
                            href={`/admin/products/${product.id}/edit`}
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-shop-muted">{product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-shop-muted">
                      {product.category?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {product.has_discount ? (
                        <span className="flex flex-wrap items-baseline gap-2">
                          <span className="font-semibold">
                            {formatMoney(product.current_price)}
                          </span>
                          <span className="text-xs text-shop-muted line-through">
                            {formatMoney(product.price)}
                          </span>
                        </span>
                      ) : (
                        <span className="font-semibold">{formatMoney(product.price)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          product.stock === 0
                            ? "font-semibold text-red-600"
                            : product.stock_status === "low_stock"
                              ? "font-semibold text-amber-600"
                              : ""
                        }
                      >
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <ActiveToggle
                          isActive={product.is_active}
                          label={product.name}
                          path={`products/${product.id}`}
                        />
                      ) : (
                        <span className="text-xs text-shop-muted">
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                          href={`/admin/products/${product.id}/edit`}
                        >
                          Edit
                        </Link>
                        {canDelete ? (
                          <DeleteButton
                            confirmMessage={`Delete ${product.name}? Its images are removed too.`}
                            path={`products/${product.id}`}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            basePath="/admin/products"
            currentPage={pagination?.current_page ?? page}
            lastPage={pagination?.last_page ?? 1}
            params={{
              search: search || undefined,
              status: status || undefined,
              category_id: categoryId || undefined,
            }}
          />
        </>
      )}
    </div>
  );
}
