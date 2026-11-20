"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format/money";
import type { Order } from "@/lib/api/types";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

function stripeClient() {
  if (!publishableKey) {
    return null;
  }

  stripePromise ??= loadStripe(publishableKey);

  return stripePromise;
}

type PaymentStepProps = {
  order: Order;
  clientSecret: string;
};

/** FR-ORDER-4: card-only Stripe Elements; the amount comes from the server. */
export function PaymentStep({ order, clientSecret }: PaymentStepProps) {
  const stripe = stripeClient();

  if (!stripe) {
    return (
      <p
        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        Card payments are not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and reload.
      </p>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Payment</h2>
      <p className="mt-1 text-sm text-shop-muted">
        Order {order.order_number} · {formatMoney(order.grand_total)}
      </p>

      <Elements
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: { colorPrimary: "#111111", borderRadius: "12px" },
          },
        }}
        stripe={stripe}
      >
        <CardForm order={order} />
      </Elements>
    </div>
  );
}

function CardForm({ order }: { order: Order }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setPending(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/confirmation/${order.id}`,
      },
      // Cards confirm in place; only methods needing a redirect leave the page.
      redirect: "if_required",
    });

    if (error) {
      // FR-ORDER-6: a declined card never marks the order paid.
      setMessage(error.message ?? "Your payment could not be completed. Please try again.");
      setPending(false);
      return;
    }

    router.push(`/checkout/confirmation/${order.id}`);
    router.refresh();
  }

  return (
    <form className="mt-6 flex flex-col gap-5" onSubmit={onSubmit}>
      {message ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <PaymentElement />

      <Button
        className="h-12 rounded-full text-sm sm:self-start sm:px-10"
        disabled={pending}
        type="submit"
      >
        {pending ? "Processing payment…" : `Pay ${formatMoney(order.grand_total)}`}
      </Button>

      <p className="text-xs text-shop-muted">
        Test mode: use 4242 4242 4242 4242 for a successful payment or 4000 0000 0000 9995 to see a
        decline. Never enter real card details.
      </p>
    </form>
  );
}
