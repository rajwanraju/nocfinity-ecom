import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminPageHeader,
  ApiFailure,
  EmptyState,
  Panel,
  PermissionNotice,
} from "@/components/admin/admin-ui";
import { OrderStatusBadge } from "@/components/storefront/order-status";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { adminGet } from "@/lib/admin/server";
import type { Customer } from "@/lib/admin/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";
import { formatMoney } from "@/lib/format/money";

export const metadata: Metadata = { title: "Customer detail" };

export default function AdminCustomerPage({ params }: { params: Promise<{ customer: string }> }) {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<Skeleton className="h-[30rem] w-full rounded-2xl" />}>
        <CustomerDetail params={params} />
      </Suspense>
    </div>
  );
}

async function CustomerDetail({ params }: { params: Promise<{ customer: string }> }) {
  const { customer: customerId } = await params;

  if (!/^\d+$/.test(customerId)) {
    notFound();
  }

  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "customers.view")) {
    return <PermissionNotice permission="customers.view" />;
  }

  const result = await adminGet<Customer>(`customers/${customerId}`);

  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }

    return <ApiFailure message={result.message} />;
  }

  const customer = result.data;
  const orders = customer.orders ?? [];

  return (
    <>
      <Link className="text-xs font-semibold text-shop-muted underline" href="/admin/customers">
        ← All customers
      </Link>
      <div className="mt-4">
        <AdminPageHeader
          description={`Customer since ${formatDate(customer.created_at)}`}
          eyebrow="Customer"
          title={customer.name}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <Panel title="Contact">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-shop-muted">Email</dt>
              <dd className="font-medium break-all">{customer.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-shop-muted">Phone</dt>
              <dd className="font-medium">{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-shop-muted">Status</dt>
              <dd className="font-medium">{customer.is_active ? "Active" : "Inactive"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Orders">
          <p className="text-2xl font-black">{customer.orders_count}</p>
          <p className="mt-1 text-xs text-shop-muted">orders placed</p>
        </Panel>
        <Panel title="Lifetime spend">
          <p className="text-2xl font-black">{formatMoney(customer.total_spent)}</p>
          <p className="mt-1 text-xs text-shop-muted">
            Last order {formatDate(customer.last_order_at)}
          </p>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Order history">
          {orders.length === 0 ? (
            <EmptyState
              description="This customer has not placed an order yet."
              title="No orders"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        className="font-semibold underline-offset-2 hover:underline"
                        href={`/admin/orders/${order.id}`}
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-shop-muted">
                      {formatDateTime(order.placed_at)}
                    </TableCell>
                    <TableCell>{order.items_count}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(order.grand_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
