"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function CancelOrderButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function cancel() {
    if (!window.confirm("Cancel this order? This cannot be undone.")) {
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        toast.error(body?.message || "This order could not be cancelled.");
        return;
      }

      toast.success(body?.message || "Order cancelled.");
      router.refresh();
    } catch {
      toast.error("The order service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      className="h-10 rounded-full px-5"
      disabled={pending}
      onClick={() => void cancel()}
      type="button"
      variant="outline"
    >
      {pending ? "Cancelling…" : "Cancel order"}
    </Button>
  );
}
