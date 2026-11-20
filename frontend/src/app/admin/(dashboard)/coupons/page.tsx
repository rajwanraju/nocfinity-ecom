import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminPageHeader,
  ApiFailure,
  EmptyState,
  PermissionNotice,
} from "@/components/admin/admin-ui";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { CouponManager } from "@/components/admin/coupon-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminGet, pageParam, paramValue, type SearchParams } from "@/lib/admin/server";
import type { Coupon } from "@/lib/admin/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Coupons" };

export default function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        description="Discount codes with usage limits and optional schedules."
        eyebrow="Marketing"
        title="Coupons"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
        <Coupons searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Coupons({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "coupons.manage")) {
    return <PermissionNotice permission="coupons.manage" />;
  }

  const query = await searchParams;
  const search = paramValue(query.search) ?? "";
  const page = pageParam(query.page);

  const result = await adminGet<Coupon[]>("coupons", {
    search: search || undefined,
    page,
  });

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  const coupons = result.data;
  const pagination = result.pagination;

  return (
    <div className="mt-8 space-y-6">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-shop-muted uppercase"
            htmlFor="coupon-search"
          >
            Search by code
          </label>
          <Input
            className="h-10"
            defaultValue={search}
            id="coupon-search"
            name="search"
            placeholder="WELCOME10"
          />
        </div>
        <Button className="h-10 rounded-full px-5" type="submit">
          Search
        </Button>
      </form>

      {coupons.length === 0 ? (
        <EmptyState
          description={search ? "Try a different code." : "Create the first discount code."}
          title="No coupons found"
        />
      ) : (
        <CouponManager coupons={coupons} />
      )}

      <AdminPagination
        basePath="/admin/coupons"
        currentPage={pagination?.current_page ?? page}
        lastPage={pagination?.last_page ?? 1}
        params={{ search: search || undefined }}
      />
    </div>
  );
}
