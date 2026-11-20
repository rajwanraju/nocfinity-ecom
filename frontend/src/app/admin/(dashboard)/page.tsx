import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ApiFailure,
  AdminPageHeader,
  Panel,
  PermissionNotice,
  StatCard,
} from "@/components/admin/admin-ui";
import { SalesChart } from "@/components/admin/sales-chart";
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
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/server";
import { formatDate } from "@/lib/admin/format";
import { adminGet } from "@/lib/admin/server";
import type { DashboardSummary } from "@/lib/admin/types";
import { formatMoney } from "@/lib/format/money";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        description="Today at a glance, the last 30 days of captured revenue and the orders that just landed."
        eyebrow="Overview"
        title="Dashboard"
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const user = await getSessionUser("staff");

  if (!hasPermission(user?.permissions, "reports.view")) {
    return <PermissionNotice permission="reports.view" />;
  }

  const result = await adminGet<DashboardSummary>("dashboard");

  if (!result.ok) {
    return <ApiFailure message={result.message} />;
  }

  const summary = result.data;

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint="Orders created today"
          label="Orders today"
          value={String(summary.today_orders)}
        />
        <StatCard
          hint="Captured payments, today"
          label="Revenue today"
          value={formatMoney(summary.today_revenue)}
        />
        <StatCard
          hint="Registered customers"
          label="Customers"
          value={String(summary.total_customers)}
        />
        <StatCard
          hint="Active products at or below the threshold"
          label="Low stock"
          value={String(summary.low_stock_count)}
        />
      </div>

      <Panel
        description="Captured revenue per day, including days without sales."
        title="Last 30 days"
      >
        <SalesChart series={summary.sales_series} />
      </Panel>

      <Panel
        actions={
          <Link className="text-xs font-semibold underline" href="/admin/orders">
            View all orders
          </Link>
        }
        title="Recent orders"
      >
        {summary.recent_orders.length === 0 ? (
          <p className="text-sm text-shop-muted">No orders yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.recent_orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      className="font-semibold underline-offset-2 hover:underline"
                      href={`/admin/orders/${order.id}`}
                    >
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-shop-muted">
                      {order.items_count} item{order.items_count === 1 ? "" : "s"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs text-shop-muted">{order.customer_email}</p>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-shop-muted">{formatDate(order.placed_at)}</TableCell>
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
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-28 w-full rounded-2xl" key={index} />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}
