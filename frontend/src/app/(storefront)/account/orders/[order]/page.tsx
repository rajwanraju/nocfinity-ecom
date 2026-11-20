import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { OrderDetail } from "@/components/storefront/order-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionToken } from "@/lib/auth/server";
import { getOrder } from "@/lib/orders/server";

export const metadata: Metadata = {
  title: "Order details",
  description: "Review the items, totals, and delivery address of your order.",
  robots: { index: false },
};

export default function OrderPage({ params }: { params: Promise<{ order: string }> }) {
  return (
    <div className="shop-container py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-[20px]" />}>
        <OrderContent params={params} />
      </Suspense>
    </div>
  );
}

async function OrderContent({ params }: { params: Promise<{ order: string }> }) {
  const { order: orderId } = await params;
  const token = await getSessionToken("customer");

  if (!token) {
    redirect(`/login?next=${encodeURIComponent(`/account/orders/${orderId}`)}`);
  }

  // FR-ORDER-13: another customer's order is indistinguishable from a missing one.
  const order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  return <OrderDetail order={order} />;
}
