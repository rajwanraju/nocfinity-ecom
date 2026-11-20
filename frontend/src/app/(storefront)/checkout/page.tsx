import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { CheckoutSummary } from "@/components/storefront/checkout-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/server";
import { getCurrentCart } from "@/lib/cart/server";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your delivery details and pay securely by card.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="shop-container py-8 sm:py-10">
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}

async function CheckoutContent() {
  const user = await getSessionUser("customer");

  if (!user) {
    redirect("/login?next=%2Fcheckout");
  }

  const cart = await getCurrentCart();

  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  return (
    <>
      <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
        Secure checkout
      </p>
      <h1 className="shop-display mt-3 text-3xl sm:text-4xl">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <CheckoutForm cart={cart} customer={{ name: user.name }} />
        <CheckoutSummary cart={cart} />
      </div>
    </>
  );
}

function CheckoutSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-48 rounded-full" />
      </div>
      <Skeleton className="h-96 w-full rounded-[20px]" />
    </div>
  );
}
