import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OrderStatusBadge } from "@/components/storefront/order-status";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format/money";
import { getSessionToken } from "@/lib/auth/server";
import { getOrders } from "@/lib/orders/server";

export const metadata: Metadata = {
  title: "My orders",
  description: "Track and review your Nocfinity orders.",
  robots: { index: false },
};

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="shop-container py-10 sm:py-14">
      <Suspense fallback={<OrdersSkeleton />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Orders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = await getSessionToken("customer");

  if (!token) {
    redirect("/login?next=%2Faccount%2Forders");
  }

  const query = await searchParams;
  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const { orders, pagination } = await getOrders(page);

  return (
    <>
      <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">Account</p>
      <h1 className="shop-display mt-3 text-3xl sm:text-4xl">My orders</h1>
      <p className="mt-3 text-sm text-shop-muted">
        Every order you have placed, newest first. Open an order to see its items and cancel it
        while it is still being prepared.
      </p>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-[20px] border border-shop-line p-8 text-center">
          <h2 className="text-lg font-bold">No orders yet</h2>
          <p className="mt-2 text-sm text-shop-muted">
            When you place your first order it will appear here.
          </p>
          <Link
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-shop-ink px-8 text-sm font-semibold text-background"
            href="/products"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-shop-line border-y border-shop-line">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                className="flex flex-wrap items-center justify-between gap-4 py-5 transition hover:bg-shop-surface"
                href={`/account/orders/${order.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">{order.order_number}</p>
                  <p className="mt-1 text-xs text-shop-muted">
                    {order.placed_at
                      ? new Date(order.placed_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}{" "}
                    · {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status} />
                  <p className="text-sm font-semibold">{formatMoney(order.grand_total)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pagination && pagination.last_page > 1 ? (
        <nav aria-label="Order pages" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link className="font-semibold underline" href={`/account/orders?page=${page - 1}`}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-shop-muted">
            Page {pagination.current_page} of {pagination.last_page}
          </span>
          {page < pagination.last_page ? (
            <Link className="font-semibold underline" href={`/account/orders?page=${page + 1}`}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-20 w-full rounded-[18px]" />
      <Skeleton className="h-20 w-full rounded-[18px]" />
    </div>
  );
}
