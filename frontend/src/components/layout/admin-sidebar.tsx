import Link from "next/link";
import { UserRound } from "lucide-react";
import { filterByPermission, hasPermission } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/handlers";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/admin/theme-toggle";

type NavItem = { label: string; href: string; permission?: string };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", permission: "reports.view" },
  { label: "Orders", href: "/admin/orders", permission: "orders.view" },
  { label: "Products", href: "/admin/products", permission: "products.view" },
  { label: "Categories", href: "/admin/categories", permission: "categories.manage" },
  { label: "Coupons", href: "/admin/coupons", permission: "coupons.manage" },
  { label: "Customers", href: "/admin/customers", permission: "customers.view" },
  { label: "Activity log", href: "/admin/activity-logs", permission: "roles.manage" },
  { label: "Staff", href: "/admin/staff", permission: "staff.manage" },
  { label: "Roles & permissions", href: "/admin/roles", permission: "roles.manage" },
  { label: "Profile", href: "/admin/profile" },
];

export function AdminSidebar({ user }: { user: AuthUser }) {
  // FR-RBAC-6: menus are hidden, but the API still enforces every permission.
  const visible = filterByPermission(navItems, user.permissions);
  const canCancelOrders = hasPermission(user.permissions, "orders.cancel");

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-shop-line bg-shop-surface lg:h-dvh lg:w-64 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <Link className="text-xl font-black tracking-[-1px]" href="/admin">
          NOCFINITY
        </Link>
        <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold tracking-[1.5px] uppercase">
          Admin
        </span>
      </div>

      <nav
        aria-label="Admin navigation"
        className="flex flex-wrap gap-1 px-3 pb-3 lg:flex-1 lg:flex-col"
      >
        {visible.map((item) => (
          <Link
            className="rounded-lg px-3 py-2 text-sm font-medium text-shop-ink transition hover:bg-background"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
        {canCancelOrders ? null : (
          <span className="px-3 py-2 text-xs text-shop-muted">Cancellations require approval</span>
        )}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-shop-line px-5 py-4">
        <span className="grid size-9 place-items-center rounded-full bg-background">
          <UserRound aria-hidden="true" size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-shop-muted">{user.roles?.join(", ") || "Staff"}</p>
        </div>
        <ThemeToggle />
        <SignOutButton endpoint="/api/admin/auth/logout" redirectTo="/admin/login" />
      </div>
    </aside>
  );
}
