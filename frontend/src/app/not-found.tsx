import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shop-container grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">
          Error 404
        </p>
        <h1 className="shop-display mt-3 text-5xl sm:text-6xl">Page not found</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-shop-muted">
          The page you are looking for has moved, sold out, or never existed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-shop-ink px-7 text-sm font-semibold text-background transition hover:opacity-80"
            href="/"
          >
            Back to home
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-shop-line px-7 text-sm font-semibold transition hover:bg-shop-surface"
            href="/products"
          >
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
