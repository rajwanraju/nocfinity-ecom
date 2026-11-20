import type { ProductSummary } from "@/lib/api/types";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: ProductSummary[];
  priority?: boolean;
};

export function ProductGrid({ products, priority = false }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard priority={priority && index < 4} product={product} />
        </li>
      ))}
    </ul>
  );
}
