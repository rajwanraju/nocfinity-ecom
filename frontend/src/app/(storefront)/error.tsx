"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side logging only; the API remains the source of truth.
    console.error(error);
  }, [error]);

  return (
    <div className="shop-container py-20 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-shop-muted uppercase">
        Something went wrong
      </p>
      <h1 className="shop-display mt-3 text-4xl sm:text-5xl">We could not load this page</h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-shop-muted">
        The store is having a moment. Try again, or head back to the collection.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          className="inline-flex h-11 items-center rounded-full bg-shop-ink px-7 text-sm font-semibold text-background"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <Link
          className="inline-flex h-11 items-center rounded-full border border-shop-line px-7 text-sm font-semibold"
          href="/products"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
