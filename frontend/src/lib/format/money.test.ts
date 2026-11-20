import { describe, expect, it } from "vitest";
import { discountPercent, formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats whole-dollar amounts without decimals", () => {
    expect(formatMoney(18900)).toBe("$189");
    expect(formatMoney(0)).toBe("$0");
  });

  it("keeps cents when the amount is not a whole dollar", () => {
    expect(formatMoney(14999)).toBe("$149.99");
    expect(formatMoney(5)).toBe("$0.05");
  });

  it("handles negative amounts", () => {
    expect(formatMoney(-2000)).toBe("-$20");
  });
});

describe("discountPercent", () => {
  it("computes the rounded percentage saved", () => {
    expect(discountPercent(18900, 14900)).toBe(21);
    expect(discountPercent(12900, 9900)).toBe(23);
  });

  it("returns zero without a real discount", () => {
    expect(discountPercent(10000, 10000)).toBe(0);
    expect(discountPercent(10000, 12000)).toBe(0);
    expect(discountPercent(0, 0)).toBe(0);
  });
});
