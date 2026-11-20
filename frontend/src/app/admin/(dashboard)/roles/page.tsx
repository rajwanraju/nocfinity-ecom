import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader, ApiFailure, PermissionNotice } from "@/components/admin/admin-ui";
import { PermissionsMatrix } from "@/components/admin/permissions-matrix";
import { Skeleton } from "@/components/ui/skeleton";
import { adminGet } from "@/lib/admin/server";
import type { PermissionMatrix } from "@/lib/admin/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Roles & permissions" };

export default function AdminRolesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        description="Every permission row against every role. The Super Admin role is owned by the system and cannot be edited."
        eyebrow="Administration"
        title="Roles & permissions"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-96 w-full rounded-2xl" />}>
        <Roles />
      </Suspense>
    </div>
  );
}

async function Roles() {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "roles.manage")) {
    return <PermissionNotice permission="roles.manage" />;
  }

  const result = await adminGet<PermissionMatrix>("permissions");

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  return (
    <div className="mt-8">
      <PermissionsMatrix groups={result.data.groups} roles={result.data.roles} />
    </div>
  );
}
