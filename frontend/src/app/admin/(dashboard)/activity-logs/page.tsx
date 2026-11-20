import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminPageHeader,
  ApiFailure,
  EmptyState,
  PermissionNotice,
} from "@/components/admin/admin-ui";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/admin/format";
import { adminGet, pageParam, paramValue, type SearchParams } from "@/lib/admin/server";
import type { ActivityEntry } from "@/lib/admin/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Activity log" };

export default function AdminActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        description="Order, coupon and profile changes recorded by staff, newest first."
        eyebrow="Administration"
        title="Activity log"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
        <ActivityLog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ActivityLog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "roles.manage")) {
    return <PermissionNotice permission="roles.manage" />;
  }

  const query = await searchParams;
  const page = pageParam(query.page);

  const result = await adminGet<ActivityEntry[]>("activity-logs", { page, per_page: 20 });

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  const entries = result.data;
  const pagination = result.pagination;

  if (entries.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState description="Staff actions will appear here." title="No activity yet" />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-shop-line">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-shop-muted">
                  {formatDateTime(entry.created_at)}
                </TableCell>
                <TableCell>{entry.user?.name ?? "System"}</TableCell>
                <TableCell>
                  <code className="rounded bg-shop-surface px-1.5 py-0.5 text-xs">
                    {entry.action}
                  </code>
                  {entry.subject_type ? (
                    <p className="mt-1 text-xs text-shop-muted">
                      {entry.subject_type}
                      {entry.subject_id ? ` #${entry.subject_id}` : ""}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">{entry.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        basePath="/admin/activity-logs"
        currentPage={pagination?.current_page ?? page}
        lastPage={pagination?.last_page ?? 1}
        params={{ action: paramValue(query.action) }}
      />
    </div>
  );
}
