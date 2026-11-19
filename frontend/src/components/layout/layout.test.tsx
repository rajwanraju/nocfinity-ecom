import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./admin-sidebar";
import { ShopHeader } from "./shop-header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

describe("ShopHeader", () => {
  it("renders the storefront navigation and cart count", () => {
    render(<ShopHeader cartCount={3} />);

    expect(screen.getByRole("link", { name: "NOCFINITY home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shopping bag, 3 items" })).toHaveAttribute(
      "href",
      "/cart",
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveAttribute("action", "/products");
  });
});

describe("AdminSidebar", () => {
  const user = {
    id: 1,
    name: "Ada Admin",
    email: "admin@example.test",
    phone: null,
    type: "staff" as const,
    is_active: true,
    email_verified_at: null,
    created_at: "2026-01-01T00:00:00+00:00",
    roles: ["Order Manager"],
    permissions: ["orders.view", "orders.update_status"],
  };

  it("only shows menu entries the staff member can open", () => {
    render(<AdminSidebar user={user} />);

    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders");
    expect(screen.queryByRole("link", { name: "Coupons" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/admin/profile");
  });

  it("shows every entry for a staff member with all permissions", () => {
    render(
      <AdminSidebar
        user={{
          ...user,
          permissions: [
            "reports.view",
            "orders.view",
            "products.view",
            "categories.view",
            "coupons.manage",
            "customers.view",
            "roles.manage",
          ],
        }}
      />,
    );

    for (const label of [
      "Dashboard",
      "Orders",
      "Products",
      "Categories",
      "Coupons",
      "Customers",
      "Activity log",
      "Staff & roles",
      "Profile",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
