import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader, ApiFailure, PermissionNotice } from "@/components/admin/admin-ui";
import { CategoryManager } from "@/components/admin/category-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { adminGet } from "@/lib/admin/server";
import type { Category } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        description="A two-level-plus tree. A category with children or products cannot be deleted."
        eyebrow="Catalog"
        title="Categories"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
        <Categories />
      </Suspense>
    </div>
  );
}

async function Categories() {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "categories.manage")) {
    return <PermissionNotice permission="categories.manage" />;
  }

  const result = await adminGet<Category[]>("categories");

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  return (
    <div className="mt-8">
      <CategoryManager tree={result.data} />
    </div>
  );
}
