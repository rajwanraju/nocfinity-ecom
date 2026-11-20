import Image from "next/image";
import { formatMoney } from "@/lib/format/money";
import type { Cart } from "@/lib/api/types";

export function CheckoutSummary({ cart }: { cart: Cart }) {
  return (
    <aside
      aria-labelledby="checkout-summary-heading"
      className="rounded-[20px] border border-shop-line p-5 sm:p-6"
    >
      <h2 className="text-lg font-bold" id="checkout-summary-heading">
        Order summary
      </h2>

      <ul className="mt-4 divide-y divide-shop-line">
        {cart.items.map((line) => (
          <li className="flex items-center gap-3 py-3" key={line.id}>
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-shop-tile">
              {line.image_url ? (
                <Image
                  alt={line.name ?? "Product"}
                  className="object-cover"
                  fill
                  sizes="56px"
                  src={line.image_url}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium">{line.name ?? line.sku}</p>
              <p className="text-xs text-shop-muted">Qty {line.quantity}</p>
            </div>
            <p className="text-sm font-semibold">{formatMoney(line.line_total)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-3 border-t border-shop-line pt-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-shop-muted">Subtotal</dt>
          <dd className="font-semibold">{formatMoney(cart.totals.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-shop-muted">Discount</dt>
          <dd className="font-semibold">
            {cart.totals.discount > 0 ? `-${formatMoney(cart.totals.discount)}` : formatMoney(0)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-shop-muted">Delivery</dt>
          <dd className="font-semibold">
            {cart.totals.shipping > 0 ? formatMoney(cart.totals.shipping) : "Free"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-shop-line pt-3 text-base">
          <dt className="font-semibold">Total</dt>
          <dd className="text-lg font-bold">{formatMoney(cart.totals.total)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-shop-muted">
        Totals are recalculated on the server before payment. Card details never reach Nocfinity.
      </p>
    </aside>
  );
}
