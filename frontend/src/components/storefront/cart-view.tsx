"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format/money";
import type { Cart, CartLine } from "@/lib/api/types";

type CartViewProps = {
  cart: Cart;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
};

export function CartView({
  cart,
  onApplyCoupon,
  onRemoveCoupon,
  onUpdateQuantity,
  onRemove,
}: CartViewProps) {
  const [code, setCode] = useState("");

  if (cart.items.length === 0) {
    return <CartEmpty />;
  }

  function apply() {
    const value = code.trim().toUpperCase();

    if (value) {
      onApplyCoupon(value);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section aria-labelledby="cart-heading">
        <h1 className="shop-display text-3xl sm:text-4xl" id="cart-heading">
          Your cart
        </h1>
        <ul className="mt-6 divide-y divide-shop-line">
          {cart.items.map((line) => (
            <li key={line.id}>
              <CartLineRow line={line} onRemove={onRemove} onUpdateQuantity={onUpdateQuantity} />
            </li>
          ))}
        </ul>
      </section>

      <aside
        aria-labelledby="summary-heading"
        className="rounded-[20px] border border-shop-line p-5 sm:p-6"
      >
        <h2 className="text-xl font-bold sm:text-2xl" id="summary-heading">
          Order summary
        </h2>

        <dl className="mt-5 space-y-3 text-sm">
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

        <div className="mt-5 border-t border-shop-line pt-5">
          {cart.coupon ? (
            <div className="flex items-center justify-between gap-3 rounded-full bg-shop-surface px-4 py-2 text-sm">
              <span className="font-semibold">{cart.coupon.code}</span>
              <button
                className="text-xs font-semibold text-shop-muted underline"
                onClick={onRemoveCoupon}
                type="button"
              >
                Remove coupon
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="coupon-code">
              Coupon code
            </label>
            <Input
              className="h-10"
              id="coupon-code"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Coupon code"
              value={code}
            />
            <Button className="h-10 rounded-full px-5" onClick={apply} type="button">
              Apply coupon
            </Button>
          </div>
          {!cart.coupon && code.trim() !== "" && (
            <button
              className="mt-3 text-xs font-semibold text-shop-muted underline"
              onClick={onRemoveCoupon}
              type="button"
            >
              Remove coupon
            </button>
          )}
        </div>

        <Link
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-shop-ink text-sm font-semibold text-background"
          href="/checkout"
        >
          Go to checkout
        </Link>
      </aside>
    </div>
  );
}

export function CartEmpty() {
  return (
    <section className="py-16 text-center">
      <h1 className="shop-display text-3xl sm:text-4xl">Your cart is empty</h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-shop-muted">
        Browse the collection and add a few pieces to get started.
      </p>
      <Link
        className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-shop-ink px-8 text-sm font-semibold text-background"
        href="/products"
      >
        Continue shopping
      </Link>
    </section>
  );
}

const WARNING_MESSAGES: Record<string, string> = {
  product_unavailable: "This product is no longer being sold.",
  product_inactive: "This product is no longer being sold.",
  category_inactive: "This product's category is no longer available.",
  out_of_stock: "Out of stock — remove it to check out.",
  insufficient_stock: "Fewer items are in stock than you requested.",
  price_changed: "The price changed since you added this item.",
};

function warningMessage(warning: string): string {
  return WARNING_MESSAGES[warning] ?? "This item needs your attention.";
}

function CartLineRow({
  line,
  onUpdateQuantity,
  onRemove,
}: {
  line: CartLine;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
}) {
  const name = line.name ?? line.sku ?? "Product";
  const max = Math.max(line.available_quantity, 1);

  return (
    <article className="flex gap-4 py-5">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-shop-tile">
        {line.image_url ? (
          <Image alt={name} className="object-cover" fill sizes="96px" src={line.image_url} />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div>
          <h2 className="line-clamp-2 text-sm font-bold sm:text-base">
            {line.slug ? <Link href={`/products/${line.slug}`}>{name}</Link> : name}
          </h2>
          <p className="mt-1 text-xs text-shop-muted">
            {formatMoney(line.current_unit_price)} each
          </p>
          {!line.is_available && (
            <p className="mt-1 text-xs font-semibold text-red-600">No longer available</p>
          )}
          {line.warnings.map((warning) => (
            <p className="mt-1 text-xs text-shop-muted" key={warning}>
              {warningMessage(warning)}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex h-9 items-center gap-1 rounded-full border border-shop-line px-1.5">
            <Button
              aria-label={`Decrease quantity of ${name}`}
              className="size-7 rounded-full"
              disabled={line.quantity <= 1}
              onClick={() => onUpdateQuantity(line.id, Math.max(1, line.quantity - 1))}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Minus aria-hidden="true" size={13} />
            </Button>
            <span className="w-7 text-center text-sm font-semibold">{line.quantity}</span>
            <Button
              aria-label={`Increase quantity of ${name}`}
              className="size-7 rounded-full"
              disabled={line.quantity >= max}
              onClick={() => onUpdateQuantity(line.id, Math.min(max, line.quantity + 1))}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Plus aria-hidden="true" size={13} />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <button
              aria-label={`Remove ${name}`}
              className="rounded-full p-1 text-shop-muted transition hover:text-shop-ink"
              onClick={() => onRemove(line.id)}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
