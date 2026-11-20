import Image from "next/image";
import Link from "next/link";
import { discountPercent, formatMoney } from "@/lib/format/money";
import type { ProductSummary } from "@/lib/api/types";

type ProductCardProps = {
  product: ProductSummary;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const image = product.primary_image;
  const percent = product.has_discount ? discountPercent(product.price, product.current_price) : 0;

  return (
    <article className="group min-w-0">
      <Link className="block" href={`/products/${product.slug}`}>
        <div className="relative aspect-[0.82] overflow-hidden rounded-[18px] bg-shop-tile">
          {image ? (
            <Image
              alt={image.alt ?? product.name}
              className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04]"
              fill
              priority={priority}
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px"
              src={image.url}
            />
          ) : (
            <span className="grid h-full place-items-center px-4 text-center text-xs text-shop-muted">
              No image
            </span>
          )}
          {percent > 0 && (
            <span className="absolute top-3 left-3 rounded-full bg-shop-ink px-3 py-1 text-[10px] font-semibold text-background">
              -{percent}%
            </span>
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm leading-5 font-bold sm:mt-4 sm:text-base">
          {product.name}
        </h3>
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold">{formatMoney(product.current_price)}</span>
        {product.has_discount && product.discount_price !== null && (
          <span className="text-shop-muted line-through">{formatMoney(product.price)}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-shop-muted">
        {product.category && <span>{product.category.name}</span>}
        {product.stock_status === "low_stock" && (
          <span className="font-semibold text-amber-700">Only {product.stock} left</span>
        )}
        {product.stock_status === "out_of_stock" && (
          <span className="font-semibold text-red-600">Out of stock</span>
        )}
      </div>
    </article>
  );
}
