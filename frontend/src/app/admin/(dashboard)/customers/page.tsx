import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AdminPageHeader,
  ApiFailure,
  EmptyState,
  PermissionNotice,
} from "@/components/admin/admin-ui";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/admin/format";
import { adminGet, pageParam, paramValue, type SearchParams } from "@/lib/admin/server";
import type { CustomerSummary } from "@/lib/admin/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";
import { formatMoney } from "@/lib/format/money";

export const metadata: Metadata = { title: "Customers" };

export default function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        description="Registered customers with their order count, paid lifetime spend and latest order."
        eyebrow="Customers"
        title="Customers"
      />
      <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Customers({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "customers.view")) {
    return <PermissionNotice permission="customers.view" />;
  }

  const query = await searchParams;
  const search = paramValue(query.search) ?? "";
  const status = paramValue(query.status) ?? "";
  const page = pageParam(query.page);

  const result = await adminGet<CustomerSummary[]>("customers", {
    search: search || undefined,
    status: status || undefined,
    page,
  });

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  const customers = result.data;
  const pagination = result.pagination;

  return (
    <div className="mt-8">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-shop-muted uppercase"
            htmlFor="customer-search"
          >
            Search
          </label>
          <Input
            className="h-10"
            defaultValue={search}
            id="customer-search"
            name="search"
            placeholder="Name or email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-shop-muted uppercase"
            htmlFor="customer-status"
          >
            Status
          </label>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={status}
            id="customer-status"
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

      {customers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            description="Try a different name, email or status."
            title="No customers found"
          />
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-shop-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total spent</TableHead>
                  <TableHead>Last order</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        className="font-semibold underline-offset-2 hover:underline"
                        href={`/admin/customers/${customer.id}`}
                      >
                        {customer.name}
                      </Link>
                      <p className="text-xs text-shop-muted">{customer.email}</p>
                    </TableCell>
                    <TableCell>{customer.orders_count}</TableCell>
                    <TableCell className="font-semibold">
                      {formatMoney(customer.total_spent)}
                    </TableCell>
                    <TableCell className="text-shop-muted">
                      {formatDate(customer.last_order_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
                          customer.is_active
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-shop-surface text-shop-muted"
                        }`}
                      >
                        {customer.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            basePath="/admin/customers"
            currentPage={pagination?.current_page ?? page}
            lastPage={pagination?.last_page ?? 1}
            params={{ search: search || undefined, status: status || undefined }}
          />
        </>
      )}
    </div>
  );
}
