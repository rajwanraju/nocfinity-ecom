import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/format/money";
import type { Order } from "@/lib/api/types";
import { CancelOrderButton } from "./cancel-order-button";
import { isCancellable, OrderStatusBadge } from "./order-status";

export function OrderDetail({ order }: { order: Order }) {
  const placed = order.placed_at ?? order.created_at;
  const items = order.items ?? [];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <section aria-labelledby="order-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
              Order
            </p>
            <h1 className="shop-display mt-2 text-3xl sm:text-4xl" id="order-heading">
              {order.order_number}
            </h1>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {placed ? (
          <p className="mt-3 text-sm text-shop-muted">
            Placed on{" "}
            {new Date(placed).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : null}

        <ul className="mt-8 divide-y divide-shop-line">
          {items.map((item) => (
            <li className="flex gap-4 py-5" key={item.id}>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-shop-tile">
                {item.image_url ? (
                  <Image
                    alt={item.product_name}
                    className="object-cover"
                    fill
                    sizes="80px"
                    src={item.image_url}
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">{item.product_name}</p>
                  <p className="mt-1 text-xs text-shop-muted">SKU {item.product_sku}</p>
                  <p className="mt-1 text-xs text-shop-muted">
                    {formatMoney(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatMoney(item.line_total)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-shop-line px-5 text-sm font-semibold"
            href="/account/orders"
          >
            All orders
          </Link>
          {isCancellable(order.status) ? <CancelOrderButton orderId={order.id} /> : null}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[20px] border border-shop-line p-5 sm:p-6">
          <h2 className="text-lg font-bold">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-shop-muted">Subtotal</dt>
              <dd className="font-semibold">{formatMoney(order.subtotal)}</dd>
            </div>
            {order.discount_total > 0 ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-shop-muted">
                  Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
                </dt>
                <dd className="font-semibold">-{formatMoney(order.discount_total)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-shop-muted">Delivery</dt>
              <dd className="font-semibold">
                {order.shipping_total > 0 ? formatMoney(order.shipping_total) : "Free"}
              </dd>
            </div>
            {order.tax_total > 0 ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-shop-muted">Tax</dt>
                <dd className="font-semibold">{formatMoney(order.tax_total)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 border-t border-shop-line pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="text-lg font-bold">{formatMoney(order.grand_total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-shop-muted">
            Payment:{" "}
            {order.payment_status ? order.payment_status.replaceAll("_", " ") : "not started"}
          </p>
        </div>

        <div className="rounded-[20px] border border-shop-line p-5 sm:p-6">
          <h2 className="text-lg font-bold">Delivery address</h2>
          <address className="mt-3 text-sm text-shop-muted not-italic">
            <span className="block font-medium text-shop-ink">{order.shipping.name}</span>
            <span className="block">{order.shipping.phone}</span>
            <span className="block">{order.shipping.line1}</span>
            {order.shipping.line2 ? <span className="block">{order.shipping.line2}</span> : null}
            <span className="block">
              {order.shipping.city}, {order.shipping.state} {order.shipping.postal_code}
            </span>
            <span className="block">{order.shipping.country}</span>
          </address>
          {order.notes ? <p className="mt-3 text-xs text-shop-muted">Note: {order.notes}</p> : null}
        </div>
      </aside>
    </div>
  );
}
