"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiEnvelope } from "@/lib/api/server";
import type { Cart, OrderCheckoutPayload } from "@/lib/api/types";
import { PaymentStep } from "./payment-step";

type Address = {
  shipping_name: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  notes: string;
};

const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IN", label: "India" },
  { code: "AE", label: "United Arab Emirates" },
];

const FIELDS: Array<{
  name: keyof Address;
  label: string;
  autoComplete: string;
  optional?: boolean;
  type?: string;
}> = [
  { name: "shipping_name", label: "Full name", autoComplete: "name" },
  { name: "shipping_phone", label: "Phone", autoComplete: "tel", type: "tel" },
  { name: "shipping_line1", label: "Address", autoComplete: "address-line1" },
  {
    name: "shipping_line2",
    label: "Apartment, suite, etc. (optional)",
    autoComplete: "address-line2",
    optional: true,
  },
  { name: "shipping_city", label: "City", autoComplete: "address-level2" },
  { name: "shipping_state", label: "State / region", autoComplete: "address-level1" },
  { name: "shipping_postal_code", label: "Postal code", autoComplete: "postal-code" },
];

type Errors = Record<string, string[]>;

export function CheckoutForm({ cart, customer }: { cart: Cart; customer: { name: string } }) {
  const [address, setAddress] = useState<Address>({
    shipping_name: customer.name,
    shipping_phone: "",
    shipping_line1: "",
    shipping_line2: "",
    shipping_city: "",
    shipping_state: "",
    shipping_postal_code: "",
    shipping_country: "US",
    notes: "",
  });
  // A stable key means a retried submission never creates a second order (FR-ORDER-3).
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [intent, setIntent] = useState<OrderCheckoutPayload | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(name: keyof Address, value: string) {
    setAddress((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: Errors = {};

    for (const field of FIELDS) {
      if (!field.optional && address[field.name].trim() === "") {
        nextErrors[field.name] = ["This field is required."];
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          ...address,
          shipping_line2: address.shipping_line2.trim() || undefined,
          notes: address.notes.trim() || undefined,
          coupon_code: cart.coupon?.code,
        }),
      });
      const body = (await response
        .json()
        .catch(() => null)) as ApiEnvelope<OrderCheckoutPayload> | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Your order could not be created. Please try again.");
        setErrors(body?.errors ?? {});
        return;
      }

      if (!body?.data?.payment?.client_secret) {
        setMessage("Card payment is not available for this order. Please contact support.");
        return;
      }

      setIntent(body.data);
    } catch {
      setMessage("The checkout service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (intent) {
    return (
      <PaymentStep clientSecret={intent.payment.client_secret as string} order={intent.order} />
    );
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
      {message ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <div>
        <h2 className="text-xl font-bold">Delivery details</h2>
        <p className="mt-1 text-sm text-shop-muted">
          Guest checkout is not available. You are signed in as {customer.name}.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            className={
              field.name === "shipping_line1" || field.name === "shipping_line2"
                ? "sm:col-span-2"
                : ""
            }
            key={field.name}
          >
            <label className="text-sm font-medium" htmlFor={`checkout-${field.name}`}>
              {field.label}
            </label>
            <Input
              aria-describedby={errors[field.name] ? `checkout-${field.name}-error` : undefined}
              aria-invalid={errors[field.name] ? true : undefined}
              autoComplete={field.autoComplete}
              className="mt-2"
              id={`checkout-${field.name}`}
              name={field.name}
              onChange={(event) => update(field.name, event.target.value)}
              type={field.type ?? "text"}
              value={address[field.name]}
            />
            {errors[field.name]?.[0] ? (
              <p className="mt-1 text-xs text-destructive" id={`checkout-${field.name}-error`}>
                {errors[field.name][0]}
              </p>
            ) : null}
          </div>
        ))}

        <div>
          <label className="text-sm font-medium" htmlFor="checkout-shipping_country">
            Country
          </label>
          <select
            aria-describedby={
              errors.shipping_country ? "checkout-shipping_country-error" : undefined
            }
            aria-invalid={errors.shipping_country ? true : undefined}
            className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="checkout-shipping_country"
            name="shipping_country"
            onChange={(event) => update("shipping_country", event.target.value)}
            value={address.shipping_country}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
          {errors.shipping_country?.[0] ? (
            <p className="mt-1 text-xs text-destructive" id="checkout-shipping_country-error">
              {errors.shipping_country[0]}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="checkout-notes">
            Delivery note (optional)
          </label>
          <textarea
            className="mt-2 min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="checkout-notes"
            maxLength={1000}
            name="notes"
            onChange={(event) => update("notes", event.target.value)}
            value={address.notes}
          />
        </div>
      </div>

      <Button
        className="h-12 rounded-full text-sm sm:self-start sm:px-10"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creating order…" : "Continue to payment"}
      </Button>
    </form>
  );
}
