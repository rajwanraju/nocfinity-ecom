import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Find your everyday style",
  description: "Shop considered essentials, new arrivals, and customer favourites at Nocfinity.",
};

export default function HomePage() {
  return (
    <div className="shop-container">
      <section className="grid gap-8 pt-8 pb-10 sm:pt-10 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pt-14">
        <div>
          <h1 className="shop-display text-[42px] sm:text-[56px] lg:text-[64px]">
            Find clothes that match your style
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-shop-muted sm:text-base">
            Browse our diverse range of meticulously crafted garments, designed to bring out your
            individuality and cater to your sense of style.
          </p>
          <Link
            className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-shop-ink px-10 text-sm font-semibold text-background transition hover:opacity-80"
            href="/products"
          >
            Shop now
          </Link>
          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4">
            {[
              { value: "200+", label: "International brands" },
              { value: "2,000+", label: "High-quality products" },
              { value: "30,000+", label: "Happy customers" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs text-shop-muted">{stat.label}</dt>
                <dd className="text-2xl font-extrabold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative aspect-square overflow-hidden rounded-[24px] bg-shop-tile">
          <Image
            alt="Model wearing a monochrome outfit"
            className="object-cover"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            src="/shop-hero.png"
          />
        </div>
      </section>

      <section
        aria-labelledby="brands-heading"
        className="border-y border-shop-line py-7"
        id="brands"
      >
        <h2 className="sr-only" id="brands-heading">
          Brands we carry
        </h2>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-lg font-extrabold tracking-tight text-shop-ink/70 sm:justify-between">
          {["VERSACE", "ZARA", "GUCCI", "PRADA", "Calvin Klein"].map((brand) => (
            <li key={brand}>{brand}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="arrivals-heading" className="py-12" id="new-arrivals">
        <h2 className="shop-display text-3xl sm:text-4xl" id="arrivals-heading">
          New arrivals
        </h2>
        <p className="mt-3 max-w-xl text-sm text-shop-muted">
          Fresh drops land here every week. Explore the full collection to find your next favourite.
        </p>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-shop-line px-8 text-sm font-semibold transition hover:bg-shop-surface"
          href="/products"
        >
          View all products
        </Link>
      </section>
    </div>
  );
}
