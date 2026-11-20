import type { Metadata } from "next";
import { Suspense } from "react";
import { CartEmpty } from "@/components/storefront/cart-view";
import { CartPageClient } from "@/components/storefront/cart-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCart } from "@/lib/cart/server";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your Nocfinity cart, update quantities, and apply a coupon before checkout.",
};

export default function CartPage() {
  return (
    <div className="shop-container py-8 sm:py-10">
      <Suspense fallback={<CartSkeleton />}>
        <CartLoader />
      </Suspense>
    </div>
  );
}

async function CartLoader() {
  const cart = await getCurrentCart();

  if (!cart || cart.items.length === 0) {
    return <CartEmpty />;
  }

  return <CartPageClient initialCart={cart} />;
}

function CartSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-[18px]" />
        <Skeleton className="h-32 w-full rounded-[18px]" />
      </div>
      <Skeleton className="h-80 w-full rounded-[20px]" />
    </div>
  );
}
