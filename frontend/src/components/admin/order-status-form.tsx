"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormError } from "@/components/admin/admin-ui";
import { ORDER_STATUS_LABELS } from "@/components/storefront/order-status";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";
import type { OrderStatus } from "@/lib/api/types";

/**
 * FR-ADMIN-4: only the transitions the API reports as valid are offered.
 * `paid` is never listed because the Stripe webhook owns it.
 */
export function OrderStatusForm({
  orderId,
  transitions,
  canUpdate,
  canCancel,
}: {
  orderId: number;
  transitions: OrderStatus[];
  canUpdate: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const allowed = transitions.filter((status) => status !== "cancelled" || canCancel);
  const [status, setStatus] = useState<OrderStatus | "">(allowed[0] ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!canUpdate) {
    return (
      <p className="text-sm text-shop-muted">
        Your role can view orders but not change their status.
      </p>
    );
  }

  if (allowed.length === 0) {
    return <p className="text-sm text-shop-muted">No further status changes are available.</p>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!status) {
      setError("Choose the next status.");
      return;
    }

    if (
      status === "cancelled" &&
      !window.confirm("Cancel this order? Refunds and stock restore run on the server.")
    ) {
      return;
    }

    setPending(true);

    const result = await adminRequest(`orders/${orderId}/status`, {
      method: "PATCH",
      body: { status, note: note.trim() || undefined },
    });

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }

    setNote("");
    toast.success(result.message || "Order status updated.");
    router.refresh();
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <FormError message={error} />
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="order-status">
          Next status
        </label>
        <select
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          id="order-status"
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          value={status}
        >
          {allowed.map((option) => (
            <option key={option} value={option}>
              {ORDER_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="order-note">
          Note (optional)
        </label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          id="order-note"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Shared with the status history entry"
          value={note}
        />
      </div>
      <Button className="h-9 rounded-full px-4" disabled={pending} type="submit">
        {pending ? "Updating…" : "Update status"}
      </Button>
    </form>
  );
}
