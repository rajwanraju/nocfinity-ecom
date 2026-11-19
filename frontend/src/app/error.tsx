"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest in the console; production logs carry the same id.
    console.error(error);
  }, [error]);

  return (
    <div className="shop-container grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
          Something went wrong
        </p>
        <h1 className="shop-display mt-3 text-5xl sm:text-6xl">We hit a snag</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-shop-muted">
          Please try again. If the problem continues, come back in a few minutes.
        </p>
        <button
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-shop-ink px-7 text-sm font-semibold text-background transition hover:opacity-80"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
