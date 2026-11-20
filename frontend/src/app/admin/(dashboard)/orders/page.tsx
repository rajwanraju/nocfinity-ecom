import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AdminPageHeader,
  ApiFailure,
  EmptyState,
  PermissionNotice,
} from "@/components/admin/admin-ui";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ORDER_STATUS_LABELS, OrderStatusBadge } from "@/components/storefront/order-status";
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
import { adminGet, pageParam, paramValue, type SearchParams } from "@/lib/admin/server";
import type { AdminOrder } from "@/lib/admin/types";
import type { OrderStatus } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";
import { formatDate } from "@/lib/admin/format";
import { formatMoney } from "@/lib/format/money";

export const metadata: Metadata = { title: "Orders" };

const STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function AdminOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        description="Every order, newest first. Open one to see its items, payment and status timeline."
        eyebrow="Operations"
        title="Orders"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
        <OrdersList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrdersList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "orders.view")) {
    return <PermissionNotice permission="orders.view" />;
  }

  const query = await searchParams;
  const search = paramValue(query.search) ?? "";
  const status = paramValue(query.status) ?? "";
  const page = pageParam(query.page);

  const result = await adminGet<AdminOrder[]>("orders", {
    search: search || undefined,
    status: status || undefined,
    page,
  });

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  const orders = result.data;
  const pagination = result.pagination;

  return (
    <div className="mt-8">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label className="text-xs font-semibold text-shop-muted uppercase" htmlFor="order-search">
            Search
          </label>
          <Input
            className="h-10"
            defaultValue={search}
            id="order-search"
            name="search"
            placeholder="Order number, name or email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-shop-muted uppercase"
            htmlFor="order-status-filter"
          >
            Status
          </label>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={status}
            id="order-status-filter"
            name="status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {ORDER_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        <Button className="h-10 rounded-full px-5" type="submit">
          Filter
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-shop-muted">
        <span>
          {pagination
            ? `${pagination.total} order${pagination.total === 1 ? "" : "s"}`
            : `${orders.length} orders`}
        </span>
        {pagination ? (
          <span>
            Page {pagination.current_page} of {pagination.last_page}
          </span>
        ) : null}
      </div>

      {orders.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            description="Try a different search term or status filter."
            title="No orders match these filters"
          />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-shop-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        className="font-semibold underline-offset-2 hover:underline"
                        href={`/admin/orders/${order.id}`}
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-xs text-shop-muted">{order.customer_email}</p>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-shop-muted">
                      {formatDate(order.placed_at ?? order.created_at)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(order.grand_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            basePath="/admin/orders"
            currentPage={pagination?.current_page ?? page}
            lastPage={pagination?.last_page ?? 1}
            params={{ search: search || undefined, status: status || undefined }}
          />
        </>
      )}
    </div>
  );
}
