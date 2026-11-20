"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toaster";
import type { ProductSummary } from "@/lib/api/types";
import { AddToCartForm } from "./add-to-cart-form";

/** Adds through the BFF so the guest cart token stays httpOnly. */
export function ProductPurchase({ product }: { product: ProductSummary }) {
  const router = useRouter();

  async function add(productId: number, quantity: number) {
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity }),
      });

      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(body.message || "This item could not be added to your cart.");
        return;
      }

      toast.success("Added to your cart.");
      router.refresh();
    } catch {
      toast.error("The cart service is unavailable. Please try again.");
    }
  }

  return <AddToCartForm product={product} onAdd={add} />;
}
