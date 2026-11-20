import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getCurrentCart } from "@/lib/cart/server";

/** Streamed cart badge. Reads the cart cookie + guest token server-side only. */
export async function CartIndicator() {
  const cart = await getCurrentCart();
  const count = cart?.item_count ?? 0;

  return (
    <Link
      aria-label={`Shopping bag, ${count} items`}
      className="relative grid size-9 place-items-center rounded-full transition hover:bg-shop-surface"
      href="/cart"
    >
      <ShoppingBag aria-hidden="true" size={21} />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-shop-ink px-1 text-[9px] leading-4 font-semibold text-background">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function CartIndicatorFallback() {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 animate-pulse place-items-center rounded-full bg-shop-surface"
    >
      <ShoppingBag size={21} />
    </span>
  );
}
