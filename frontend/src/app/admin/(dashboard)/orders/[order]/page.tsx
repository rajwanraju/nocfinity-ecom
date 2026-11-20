import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader, ApiFailure, Panel } from "@/components/admin/admin-ui";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { OrderStatusBadge } from "@/components/storefront/order-status";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/admin/format";
import { adminGet } from "@/lib/admin/server";
import type { AdminOrder } from "@/lib/admin/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";
import { formatMoney } from "@/lib/format/money";

export const metadata: Metadata = { title: "Order detail" };

export default function AdminOrderPage({ params }: { params: Promise<{ order: string }> }) {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-2xl" />}>
        <OrderDetail params={params} />
      </Suspense>
    </div>
  );
}

async function OrderDetail({ params }: { params: Promise<{ order: string }> }) {
  const { order: orderId } = await params;

  if (!/^\d+$/.test(orderId)) {
    notFound();
  }

  const user = await getSessionUser("staff");
  const permissions = user?.permissions ?? [];

  if (!hasPermission(permissions, "orders.view")) {
    return <ApiFailure message="Your role does not allow viewing orders." />;
  }

  const result = await adminGet<AdminOrder>(`orders/${orderId}`);

  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }

    return <ApiFailure message={result.message} />;
  }

  const order = result.data;
  const placed = order.placed_at ?? order.created_at;

  return (
    <>
      <Link className="text-xs font-semibold text-shop-muted underline" href="/admin/orders">
        ← All orders
      </Link>

      <div className="mt-4">
        <AdminPageHeader
          actions={<OrderStatusBadge status={order.status} />}
          description={placed ? `Placed ${formatDateTime(placed)}` : undefined}
          eyebrow="Order"
          title={order.order_number}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          <Panel title="Items">
            <ul className="divide-y divide-shop-line">
              {order.items.map((item) => (
                <li
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  key={item.id}
                >
                  <div>
                    <p className="text-sm font-bold">{item.product_name}</p>
                    <p className="text-xs text-shop-muted">SKU {item.product_sku}</p>
                    <p className="text-xs text-shop-muted">
                      {formatMoney(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(item.line_total)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-shop-line pt-4 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotal)} />
              {order.discount_total > 0 ? (
                <Row
                  label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
                  value={`-${formatMoney(order.discount_total)}`}
                />
              ) : null}
              <Row
                label="Shipping"
                value={order.shipping_total > 0 ? formatMoney(order.shipping_total) : "Free"}
              />
              {order.tax_total > 0 ? (
                <Row label="Tax" value={formatMoney(order.tax_total)} />
              ) : null}
              <div className="flex items-center justify-between border-t border-shop-line pt-2 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold">{formatMoney(order.grand_total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Status timeline">
            {order.status_history.length === 0 ? (
              <p className="text-sm text-shop-muted">No status changes recorded yet.</p>
            ) : (
              <ol className="space-y-4">
                {order.status_history.map((entry, index) => (
                  <li className="flex gap-3" key={`${entry.created_at ?? "entry"}-${index}`}>
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-shop-ink"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {entry.from_status ? `${entry.from_status} → ` : ""}
                        {entry.to_status}
                      </p>
                      {entry.note ? <p className="text-xs text-shop-muted">{entry.note}</p> : null}
                      <p className="text-xs text-shop-muted">{formatDateTime(entry.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Update status">
            <OrderStatusForm
              canCancel={hasPermission(permissions, "orders.cancel")}
              canUpdate={hasPermission(permissions, "orders.update_status")}
              orderId={order.id}
              transitions={order.valid_transitions}
            />
          </Panel>

          <Panel title="Customer">
            <p className="text-sm font-semibold">{order.customer_name}</p>
            <p className="text-xs text-shop-muted">{order.customer_email}</p>
            {order.customer ? (
              <Link
                className="mt-3 inline-block text-xs font-semibold underline"
                href={`/admin/customers/${order.customer.id}`}
              >
                View customer
              </Link>
            ) : null}
          </Panel>

          <Panel title="Delivery address">
            <address className="text-sm text-shop-muted not-italic">
              <span className="block font-medium text-foreground">{order.shipping.name}</span>
              <span className="block">{order.shipping.phone}</span>
              <span className="block">{order.shipping.line1}</span>
              {order.shipping.line2 ? <span className="block">{order.shipping.line2}</span> : null}
              <span className="block">
                {order.shipping.city}, {order.shipping.state} {order.shipping.postal_code}
              </span>
              <span className="block">{order.shipping.country}</span>
            </address>
            {order.notes ? (
              <p className="mt-3 text-xs text-shop-muted">Note: {order.notes}</p>
            ) : null}
          </Panel>

          <Panel title="Payment">
            <p className="text-sm">
              <span className="text-shop-muted">Status: </span>
              <span className="font-semibold">
                {order.payment_status ? order.payment_status.replaceAll("_", " ") : "not started"}
              </span>
            </p>
            {order.paid_at ? (
              <p className="mt-1 text-xs text-shop-muted">Paid {formatDateTime(order.paid_at)}</p>
            ) : null}
            {order.cancelled_at ? (
              <p className="mt-1 text-xs text-shop-muted">
                Cancelled {formatDateTime(order.cancelled_at)}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-shop-muted">
              Paid status is set by the Stripe webhook, not from this screen.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-shop-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
