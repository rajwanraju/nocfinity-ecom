"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/toaster";
import type { Cart } from "@/lib/api/types";
import { CartView } from "./cart-view";

type CartPageClientProps = {
  initialCart: Cart;
};

type CartResponse = {
  success: boolean;
  message: string;
  data: Cart | null;
  errors: Record<string, string[]> | null;
};

/**
 * Client-side cart controller. The backend remains the source of truth: every
 * mutation replaces the whole cart from the response, then refreshes the
 * server-rendered header badge.
 */
export function CartPageClient({ initialCart }: CartPageClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [pending, setPending] = useState(false);

  async function request(url: string, init: RequestInit) {
    setPending(true);

    try {
      const response = await fetch(url, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
      });

      if (response.status === 204) {
        const reload = await fetch("/api/cart", { cache: "no-store" });

        if (reload.ok) {
          const body = (await reload.json()) as CartResponse;
          if (body.data) {
            setCart(body.data);
          }
        }

        router.refresh();
        return;
      }

      const body = (await response.json()) as CartResponse;

      if (!response.ok) {
        toast.error(body.message || "The cart could not be updated.");

        if (body.errors) {
          const first = Object.values(body.errors)[0]?.[0];
          if (first && first !== body.message) {
            toast.error(first);
          }
        }

        return;
      }

      if (body.data) {
        setCart(body.data);
      }

      router.refresh();
    } catch {
      toast.error("The cart service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function updateQuantity(itemId: number, quantity: number) {
    void request(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }

  function remove(itemId: number) {
    void request(`/api/cart/items/${itemId}`, { method: "DELETE" });
  }

  function applyCoupon(code: string) {
    void request("/api/cart/coupon", { method: "POST", body: JSON.stringify({ code }) });
  }

  function removeCoupon() {
    void request("/api/cart/coupon", { method: "DELETE" });
  }

  return (
    <div aria-busy={pending}>
      <CartView
        cart={cart}
        onApplyCoupon={applyCoupon}
        onRemove={remove}
        onRemoveCoupon={removeCoupon}
        onUpdateQuantity={updateQuantity}
      />
    </div>
  );
}
