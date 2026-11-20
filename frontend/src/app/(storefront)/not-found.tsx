import Link from "next/link";

export default function StorefrontNotFound() {
  return (
    <div className="shop-container py-20 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-shop-muted uppercase">404</p>
      <h1 className="shop-display mt-3 text-4xl sm:text-5xl">We could not find that page</h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-shop-muted">
        The link may be broken, or the piece may have sold out and moved on.
      </p>
      <Link
        className="mt-7 inline-flex h-11 items-center rounded-full bg-shop-ink px-7 text-sm font-semibold text-background"
        href="/products"
      >
        Browse the collection
      </Link>
    </div>
  );
}
