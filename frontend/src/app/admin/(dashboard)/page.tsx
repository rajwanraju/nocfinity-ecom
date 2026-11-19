import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[2px] text-shop-muted uppercase">Overview</p>
      <h1 className="shop-display mt-3 text-3xl sm:text-4xl">Dashboard</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-24 w-full max-w-2xl" />}>
        <SessionSummary />
      </Suspense>
    </div>
  );
}

async function SessionSummary() {
  const user = await getSessionUser("staff");
  const permissions = user?.permissions ?? [];

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:max-w-3xl">
      <section className="rounded-2xl border border-shop-line p-5">
        <h2 className="text-sm font-semibold">Signed in as</h2>
        <p className="mt-2 text-lg font-bold">{user?.name ?? "Staff member"}</p>
        <p className="text-sm text-shop-muted">{user?.roles?.join(", ") || "Staff"}</p>
      </section>
      <section className="rounded-2xl border border-shop-line p-5">
        <h2 className="text-sm font-semibold">Access</h2>
        <p className="mt-2 text-sm text-shop-muted">
          {permissions.length > 0
            ? `You can access ${permissions.length} admin action${permissions.length === 1 ? "" : "s"}. The sidebar only shows what your role allows.`
            : "No admin permissions are assigned to your account yet."}
        </p>
      </section>
    </div>
  );
}
