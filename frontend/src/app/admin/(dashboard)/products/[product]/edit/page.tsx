import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader, ApiFailure, Panel, PermissionNotice } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { Skeleton } from "@/components/ui/skeleton";
import { flattenCategories } from "@/lib/admin/catalog";
import { adminGet } from "@/lib/admin/server";
import type { Category, Product } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage({ params }: { params: Promise<{ product: string }> }) {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<Skeleton className="h-[40rem] w-full rounded-2xl" />}>
        <EditProduct params={params} />
      </Suspense>
    </div>
  );
}

async function EditProduct({ params }: { params: Promise<{ product: string }> }) {
  const { product: productId } = await params;

  if (!/^\d+$/.test(productId)) {
    notFound();
  }

  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "products.edit")) {
    return <PermissionNotice permission="products.edit" />;
  }

  const [productResult, categoriesResult] = await Promise.all([
    adminGet<Product>(`products/${productId}`),
    adminGet<Category[]>("categories"),
  ]);

  if (!productResult.ok) {
    if (productResult.status === 404) {
      notFound();
    }

    return <ApiFailure message={productResult.message} />;
  }

  const product = productResult.data;
  const categories = categoriesResult.ok ? flattenCategories(categoriesResult.data) : [];

  return (
    <>
      <Link className="text-xs font-semibold text-shop-muted underline" href="/admin/products">
        ← All products
      </Link>
      <div className="mt-4">
        <AdminPageHeader
          description={`SKU ${product.sku}`}
          eyebrow="Catalog"
          title={product.name}
        />
      </div>

      <div className="mt-8 space-y-6">
        <Panel title="Details">
          <ProductForm categories={categories} product={product} />
        </Panel>

        <Panel description="The primary image is used on listings and cards." title="Images">
          <ProductImages images={product.images} productId={product.id} />
        </Panel>
      </div>
    </>
  );
}
