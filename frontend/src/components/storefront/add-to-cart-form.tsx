"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format/money";
import type { ProductSummary } from "@/lib/api/types";

type AddToCartFormProps = {
  product: ProductSummary;
  onAdd: (productId: number, quantity: number) => Promise<void> | void;
};

export function AddToCartForm({ product, onAdd }: AddToCartFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const outOfStock = product.stock_status === "out_of_stock" || product.stock <= 0;
  const atMax = outOfStock || quantity >= product.stock;

  async function submit() {
    if (outOfStock || pending) {
      return;
    }

    setPending(true);

    try {
      await onAdd(product.id, quantity);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-2xl font-bold">{formatMoney(product.current_price)}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 items-center gap-1 rounded-full border border-shop-line px-2">
          <Button
            aria-label="Decrease quantity"
            className="size-8 rounded-full"
            disabled={quantity <= 1 || outOfStock}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Minus aria-hidden="true" size={14} />
          </Button>
          <span aria-live="polite" className="w-8 text-center text-sm font-semibold">
            {quantity}
          </span>
          <Button
            aria-label="Increase quantity"
            className="size-8 rounded-full"
            disabled={atMax}
            onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus aria-hidden="true" size={14} />
          </Button>
        </div>
        <Button
          className="h-11 flex-1 rounded-full bg-shop-ink px-8 text-sm font-semibold text-background hover:bg-shop-ink/80"
          disabled={outOfStock || pending}
          onClick={submit}
          type="button"
        >
          {outOfStock ? "Out of stock" : pending ? "Adding…" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
