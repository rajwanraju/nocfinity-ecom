import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("accepts an internal path", () => {
    expect(safeNextPath("/admin/orders?page=2", "/admin")).toBe("/admin/orders?page=2");
  });

  it("rejects absolute URLs, protocol-relative URLs and backslash tricks", () => {
    expect(safeNextPath("https://evil.test", "/admin")).toBe("/admin");
    expect(safeNextPath("//evil.test", "/admin")).toBe("/admin");
    expect(safeNextPath("/\\evil.test", "/admin")).toBe("/admin");
    expect(safeNextPath("admin/orders", "/admin")).toBe("/admin");
  });

  it("falls back for null and empty values", () => {
    expect(safeNextPath(null, "/account")).toBe("/account");
    expect(safeNextPath("", "/account")).toBe("/account");
  });
});
