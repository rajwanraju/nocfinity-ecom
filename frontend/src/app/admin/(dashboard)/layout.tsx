import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Nocfinity admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background lg:flex">
      <Suspense fallback={<SidebarSkeleton />}>
        <SessionSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:overflow-y-auto">{children}</main>
    </div>
  );
}

async function SessionSidebar() {
  const user = await getSessionUser("staff");

  if (!user) {
    // The proxy redirects guests before this renders; this is a stale-cookie
    // fallback so the layout still has a usable shell.
    return <SidebarSkeleton />;
  }

  return <AdminSidebar user={user} />;
}

function SidebarSkeleton() {
  return (
    <aside className="w-full shrink-0 border-b border-shop-line bg-shop-surface p-5 lg:h-dvh lg:w-64 lg:border-r lg:border-b-0">
      <Skeleton className="h-7 w-32" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-8 w-full" key={index} />
        ))}
      </div>
    </aside>
  );
}
