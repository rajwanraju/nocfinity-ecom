import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { OrderDetail } from "@/components/storefront/order-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionToken } from "@/lib/auth/server";
import { getOrder } from "@/lib/orders/server";

export const metadata: Metadata = {
  title: "Order confirmation",
  description: "Your Nocfinity order confirmation.",
  robots: { index: false },
};

export default function ConfirmationPage({ params }: { params: Promise<{ order: string }> }) {
  return (
    <div className="shop-container py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-[20px]" />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

const COPY = {
  pending: {
    eyebrow: "Almost there",
    heading: "Confirming your payment",
    body: "Stripe is still confirming the payment with your bank. This page updates once the payment is verified — refresh in a moment, or check My Orders.",
  },
  cancelled: {
    eyebrow: "No payment taken",
    heading: "Order cancelled",
    body: "This order was cancelled, so no payment will be collected. Start a new checkout whenever you are ready.",
  },
  confirmed: {
    eyebrow: "Thank you",
    heading: "Order confirmed",
    body: "Your payment was received and a confirmation email is on its way. We will email you again when your order ships.",
  },
} as const;

async function Confirmation({ params }: { params: Promise<{ order: string }> }) {
  const { order: orderId } = await params;
  const token = await getSessionToken("customer");

  if (!token) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/confirmation/${orderId}`)}`);
  }

  const order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  const copy =
    order.status === "pending"
      ? COPY.pending
      : order.status === "cancelled"
        ? COPY.cancelled
        : COPY.confirmed;

  return (
    <>
      <div className="mb-8 rounded-[20px] border border-shop-line bg-shop-surface p-6 sm:p-8">
        <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="shop-display mt-3 text-3xl sm:text-4xl">{copy.heading}</h1>
        <p className="mt-3 max-w-xl text-sm text-shop-muted">{copy.body}</p>
        <p className="mt-4 text-sm">
          <Link className="font-semibold underline" href="/account/orders">
            View all orders
          </Link>{" "}
          <span className="text-shop-muted">or</span>{" "}
          <Link className="font-semibold underline" href="/products">
            keep shopping
          </Link>
        </p>
      </div>

      <OrderDetail order={order} />
    </>
  );
}
