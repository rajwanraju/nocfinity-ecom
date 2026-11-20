import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, PackageCheck, RefreshCcw, Truck } from "lucide-react";
import { Suspense } from "react";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductGrid } from "@/components/storefront/product-grid";
import { ProductPurchase } from "@/components/storefront/product-purchase";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api/server";
import { createCatalogApi } from "@/lib/api/catalog";
import { discountPercent, formatMoney } from "@/lib/format/money";
import type { Product } from "@/lib/api/types";

type ProductPageProps = { params: Promise<{ slug: string }> };

function humanize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function plainText(value: string | null, maxLength = 160): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Real metadata for a product, and a noindex signal for slugs that do not
 * exist. Cache Components streams the detail body, so the HTTP status cannot be
 * changed after the shell is sent; `robots` is what keeps dead URLs out of
 * search results instead.
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalog = createCatalogApi(apiFetch);

  try {
    const product = await catalog.getProduct(slug);
    const description =
      plainText(product.description) ||
      `Shop the ${product.name} at Nocfinity. Considered style, honest pricing, and free delivery over $100.`;
    const image = product.primary_image ?? product.images[0];

    return {
      title: product.name,
      description,
      openGraph: {
        title: `${product.name} | Nocfinity`,
        description,
        type: "website",
        ...(image ? { images: [{ url: image.url, alt: image.alt ?? product.name }] } : {}),
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { title: "Product not found", robots: { index: false, follow: false } };
    }

    const name = humanize(slug);

    return {
      title: name,
      description: `Shop the ${name} at Nocfinity. Considered style, honest pricing, and free delivery over $100.`,
    };
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <div className="shop-container py-8 sm:py-10">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({ params }: ProductPageProps) {
  const { slug } = await params;
  const catalog = createCatalogApi(apiFetch);

  let product: Product;

  try {
    product = await catalog.getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return <ProductDetailBody product={product} />;
}

function ProductDetailBody({ product }: { product: Product }) {
  const images =
    product.images.length > 0
      ? product.images
      : product.primary_image
        ? [product.primary_image]
        : [];
  const percent = product.has_discount ? discountPercent(product.price, product.current_price) : 0;

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex items-center gap-1.5 text-xs text-shop-muted sm:text-sm"
      >
        <Link className="hover:text-shop-ink" href="/">
          Home
        </Link>
        <ChevronRight aria-hidden="true" size={14} />
        <Link className="hover:text-shop-ink" href="/products">
          Shop
        </Link>
        {product.category && (
          <>
            <ChevronRight aria-hidden="true" size={14} />
            <Link
              className="hover:text-shop-ink"
              href={`/products?category=${encodeURIComponent(product.category.slug)}`}
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} name={product.name} />

        <div>
          {product.category && (
            <Link
              className="text-xs font-semibold tracking-[0.16em] text-shop-muted uppercase"
              href={`/products?category=${encodeURIComponent(product.category.slug)}`}
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="shop-display mt-2 text-3xl sm:text-5xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold">{formatMoney(product.current_price)}</span>
            {product.has_discount && product.discount_price !== null && (
              <>
                <span className="text-base text-shop-muted line-through">
                  {formatMoney(product.price)}
                </span>
                <span className="rounded-full bg-shop-ink px-2.5 py-1 text-xs font-semibold text-background">
                  Save {percent}%
                </span>
              </>
            )}
          </div>

          <p className="mt-3 text-sm">
            {product.stock_status === "out_of_stock" ? (
              <span className="font-semibold text-red-600">Out of stock</span>
            ) : product.stock_status === "low_stock" ? (
              <span className="font-semibold text-amber-700">
                Low stock — only {product.stock} left
              </span>
            ) : (
              <span className="font-semibold text-emerald-700">In stock</span>
            )}
          </p>

          <div className="mt-6">
            <ProductPurchase product={product} />
          </div>

          {product.description && (
            <div className="mt-8 border-t border-shop-line pt-6">
              <h2 className="text-base font-bold">Details</h2>
              <p className="mt-2 text-sm leading-6 whitespace-pre-line text-shop-muted">
                {product.description}
              </p>
            </div>
          )}

          <ul className="mt-6 divide-y divide-shop-line border-y border-shop-line text-sm">
            <li className="flex items-start gap-3 py-3">
              <Truck aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              <span>Free delivery on orders over $100. Standard delivery in 3–5 working days.</span>
            </li>
            <li className="flex items-start gap-3 py-3">
              <RefreshCcw aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              <span>Easy 30-day returns on unworn items with tags attached.</span>
            </li>
            <li className="flex items-start gap-3 py-3">
              <PackageCheck aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              <span>Secure checkout and order tracking from dispatch to delivery.</span>
            </li>
          </ul>

          <p className="mt-4 text-xs text-shop-muted">SKU: {product.sku}</p>
        </div>
      </div>

      {product.related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 className="shop-display text-3xl sm:text-4xl" id="related-heading">
            You may also like
          </h2>
          <div className="mt-6">
            <ProductGrid products={product.related} />
          </div>
        </section>
      )}

      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            sku: product.sku,
            description: product.description ?? undefined,
            image: images.map((image) => image.url),
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price: (product.current_price / 100).toFixed(2),
              availability:
                product.stock_status === "out_of_stock"
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
            },
          }),
        }}
        type="application/ld+json"
      />
    </>
  );
}

function ProductDetailSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <Skeleton className="aspect-square rounded-[24px]" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
