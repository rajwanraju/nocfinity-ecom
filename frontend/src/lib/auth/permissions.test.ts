import { describe, expect, it } from "vitest";
import { filterByPermission, hasPermission } from "./permissions";

describe("permission helpers", () => {
  it("matches an exact permission", () => {
    expect(hasPermission(["orders.view", "orders.update_status"], "orders.view")).toBe(true);
    expect(hasPermission(["orders.view"], "coupons.manage")).toBe(false);
    expect(hasPermission(undefined, "orders.view")).toBe(false);
  });

  it("filters navigation items the staff member cannot open", () => {
    const items = [
      { label: "Dashboard", permission: "reports.view" },
      { label: "Orders", permission: "orders.view" },
      { label: "Coupons", permission: "coupons.manage" },
      { label: "Profile" },
    ];

    const visible = filterByPermission(items, ["orders.view"]);

    expect(visible.map((item) => item.label)).toEqual(["Orders", "Profile"]);
  });

  it("returns no permission-gated items for an empty permission list", () => {
    const items = [{ label: "Orders", permission: "orders.view" }, { label: "Profile" }];

    expect(filterByPermission(items, [])).toEqual([{ label: "Profile" }]);
  });
});
