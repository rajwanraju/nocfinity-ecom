import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader, ApiFailure, PermissionNotice } from "@/components/admin/admin-ui";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StaffManager } from "@/components/admin/staff-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminGet, pageParam, paramValue, type SearchParams } from "@/lib/admin/server";
import type { Role, Staff } from "@/lib/admin/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Staff" };

export default function AdminStaffPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        description="Create staff accounts, assign roles and deactivate access. Staff are deactivated rather than deleted."
        eyebrow="Administration"
        title="Staff"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
        <StaffList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StaffList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser("staff");
  const permissions = user?.permissions ?? [];

  if (!hasPermission(permissions, "staff.manage")) {
    return <PermissionNotice permission="staff.manage" />;
  }

  const query = await searchParams;
  const search = paramValue(query.search) ?? "";
  const role = paramValue(query.role) ?? "";
  const status = paramValue(query.status) ?? "";
  const page = pageParam(query.page);

  const [staffResult, rolesResult] = await Promise.all([
    adminGet<Staff[]>("staff", {
      search: search || undefined,
      role: role || undefined,
      status: status || undefined,
      page,
    }),
    adminGet<Role[]>("roles"),
  ]);

  if (!staffResult.ok) {
    return <ApiFailure message={staffResult.message} />;
  }

  const staff = staffResult.data;
  const pagination = staffResult.pagination;
  const rolesAvailable = rolesResult.ok;
  const roleOptions = [
    ...new Set(
      rolesAvailable
        ? rolesResult.data.map((item) => item.name)
        : staff.flatMap((member) => member.roles),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <div className="mt-8">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label className="text-xs font-semibold text-shop-muted uppercase" htmlFor="staff-search">
            Search
          </label>
          <Input
            className="h-10"
            defaultValue={search}
            id="staff-search"
            name="search"
            placeholder="Name or email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-shop-muted uppercase" htmlFor="staff-role">
            Role
          </label>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={role}
            id="staff-role"
            name="role"
          >
            <option value="">All roles</option>
            {(rolesAvailable ? rolesResult.data.map((item) => item.name) : roleOptions).map(
              (name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-shop-muted uppercase" htmlFor="staff-status">
            Status
          </label>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={status}
            id="staff-status"
            name="status"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Button className="h-10 rounded-full px-5" type="submit">
          Filter
        </Button>
      </form>

      <StaffManager
        currentUserId={user?.id ?? null}
        roleOptions={roleOptions}
        rolesAvailable={rolesAvailable}
        staff={staff}
      />

      <AdminPagination
        basePath="/admin/staff"
        currentPage={pagination?.current_page ?? page}
        lastPage={pagination?.last_page ?? 1}
        params={{
          search: search || undefined,
          role: role || undefined,
          status: status || undefined,
        }}
      />
    </div>
  );
}
