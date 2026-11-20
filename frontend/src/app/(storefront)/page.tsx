import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Suspense } from "react";
import { ProductGrid } from "@/components/storefront/product-grid";
import { ProductGridSkeleton } from "@/components/storefront/product-grid-skeleton";
import { apiFetch } from "@/lib/api/server";
import { createCatalogApi } from "@/lib/api/catalog";
import type { Category, ProductSummary } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Find your everyday style",
  description:
    "Shop considered essentials, new arrivals, and customer favourites at Nocfinity. Free delivery on orders over $100.",
  openGraph: {
    title: "Nocfinity — Find your everyday style",
    description: "Considered essentials, fresh arrivals, and everyday style.",
    type: "website",
  },
};

const brands = ["VERSACE", "ZARA", "GUCCI", "PRADA", "Calvin Klein"];
const stats = [
  { value: "200+", label: "International brands" },
  { value: "2,000+", label: "High-quality products" },
  { value: "30,000+", label: "Happy customers" },
];
const testimonials = [
  {
    name: "Sarah M.",
    quote:
      "I'm blown away by the quality and style. Every piece I've bought has exceeded my expectations.",
  },
  {
    name: "Alex K.",
    quote: "A thoughtful range of clothes that makes finding my own style feel effortless.",
  },
  {
    name: "James L.",
    quote: "The fit is great, the fabric feels premium, and the designs are refreshingly original.",
  },
];

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
            {stats.map((stat) => (
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
          {brands.map((brand) => (
            <li key={brand}>{brand}</li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<HomeSectionsFallback />}>
        <HomeSections />
      </Suspense>

      <section
        aria-labelledby="testimonials-heading"
        className="border-t border-shop-line py-12 sm:py-16"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="shop-display text-3xl sm:text-4xl" id="testimonials-heading">
            Loved by customers
          </h2>
          <p className="text-sm text-shop-muted">Real words from the Nocfinity community.</p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li className="rounded-[20px] border border-shop-line p-5" key={testimonial.name}>
              <div aria-label="Rated 5 out of 5" className="flex gap-0.5 text-shop-ink">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star aria-hidden="true" fill="currentColor" key={index} size={15} />
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-shop-muted">“{testimonial.quote}”</p>
              <p className="mt-4 text-sm font-semibold">{testimonial.name}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type HomeData = {
  categories: Category[];
  arrivals: ProductSummary[];
  affordable: ProductSummary[];
};

async function HomeSections() {
  const data = await loadHomeData();

  if (!data) {
    return <HomeError />;
  }

  return <HomeContent data={data} />;
}

async function loadHomeData(): Promise<HomeData | null> {
  const catalog = createCatalogApi(apiFetch);

  try {
    const [categories, arrivals, affordable] = await Promise.all([
      catalog.listCategories(),
      catalog.listProducts({ sort: "newest", perPage: 8 }),
      catalog.listProducts({ sort: "price_asc", maxPrice: 10000, perPage: 4 }),
    ]);

    return {
      categories,
      arrivals: arrivals.data,
      affordable: affordable.data,
    };
  } catch {
    return null;
  }
}

function HomeContent({ data }: { data: HomeData }) {
  const { categories, arrivals, affordable } = data;

  return (
    <>
      {categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="pt-12" id="categories">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="shop-display text-3xl sm:text-4xl" id="categories-heading">
              Shop by category
            </h2>
            <Link className="text-sm font-semibold underline underline-offset-4" href="/products">
              View everything
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 4).map((category) => (
              <li key={category.id}>
                <CategoryTile category={category} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="arrivals-heading" className="pt-14" id="new-arrivals">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="shop-display text-3xl sm:text-4xl" id="arrivals-heading">
              New arrivals
            </h2>
            <p className="mt-3 max-w-xl text-sm text-shop-muted">
              Fresh drops land here every week. Explore the full collection to find your next
              favourite.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-shop-line px-8 text-sm font-semibold transition hover:bg-shop-surface"
            href="/products?sort=newest"
          >
            View all
          </Link>
        </div>
        <div className="mt-6">
          <ProductGrid products={arrivals} priority />
        </div>
      </section>

      <section aria-labelledby="affordable-heading" className="pt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="shop-display text-3xl sm:text-4xl" id="affordable-heading">
              Under $100
            </h2>
            <p className="mt-3 max-w-xl text-sm text-shop-muted">
              Everyday pieces that do not stretch the budget.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-shop-line px-8 text-sm font-semibold transition hover:bg-shop-surface"
            href="/products?max=100&sort=price_asc"
          >
            Shop under $100
          </Link>
        </div>
        <div className="mt-6">
          <ProductGrid products={affordable} />
        </div>
      </section>

      <section className="mt-14 grid gap-6 rounded-[24px] bg-shop-surface p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-shop-muted uppercase">
            The Nocfinity edit
          </p>
          <h2 className="shop-display mt-3 text-3xl sm:text-5xl">
            Built for the everyday, styled for you
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-shop-muted">
            Considered fabrics, honest pricing, and pieces that work together. Free delivery on
            orders over $100, with easy returns.
          </p>
          <Link
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-shop-ink px-8 text-sm font-semibold text-background"
            href="/products"
          >
            Explore the collection
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[18px]">
          <Image
            alt="A curated rail of Nocfinity clothing"
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            src="/shop-hero.png"
          />
        </div>
      </section>
    </>
  );
}

function HomeError() {
  return (
    <section className="mt-12 rounded-[20px] border border-shop-line p-8 text-center">
      <h2 className="text-xl font-bold">The catalogue is taking a short break</h2>
      <p className="mt-2 text-sm text-shop-muted">
        We could not load products right now. Please try again in a moment.
      </p>
      <Link className="mt-5 inline-block text-sm font-semibold underline" href="/">
        Try again
      </Link>
    </section>
  );
}

function CategoryTile({ category }: { category: Category }) {
  return (
    <Link
      className="group relative block aspect-[4/3] overflow-hidden rounded-[18px] bg-shop-tile"
      href={`/products?category=${encodeURIComponent(category.slug)}`}
    >
      {category.image_url ? (
        <Image
          alt={category.name}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, 25vw"
          src={category.image_url}
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300"
        />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-base font-bold text-white">
        {category.name}
      </span>
    </Link>
  );
}

function HomeSectionsFallback() {
  return (
    <div className="space-y-14 pt-12">
      <ProductGridSkeleton count={4} />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
