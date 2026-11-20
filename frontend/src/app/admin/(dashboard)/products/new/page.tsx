import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPageHeader, ApiFailure, Panel, PermissionNotice } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { Skeleton } from "@/components/ui/skeleton";
import { flattenCategories } from "@/lib/admin/catalog";
import { adminGet } from "@/lib/admin/server";
import type { Category } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<Skeleton className="h-[34rem] w-full rounded-2xl" />}>
        <NewProduct />
      </Suspense>
    </div>
  );
}

async function NewProduct() {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "products.create")) {
    return <PermissionNotice permission="products.create" />;
  }

  const categories = await adminGet<Category[]>("categories");

  if (!categories.ok) {
    return <ApiFailure message={categories.message} />;
  }

  return (
    <>
      <Link className="text-xs font-semibold text-shop-muted underline" href="/admin/products">
        ← All products
      </Link>
      <div className="mt-4">
        <AdminPageHeader
          description="Images can be uploaded once the product exists."
          eyebrow="Catalog"
          title="New product"
        />
      </div>
      <div className="mt-8">
        <Panel>
          <ProductForm categories={flattenCategories(categories.data)} />
        </Panel>
      </div>
    </>
  );
}
