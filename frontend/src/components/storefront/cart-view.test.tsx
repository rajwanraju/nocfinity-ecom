import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Cart } from "@/lib/api/types";
import { CartView } from "./cart-view";

const cart: Cart = {
  id: 9,
  is_guest: false,
  item_count: 2,
  items: [
    {
      id: 4,
      product_id: 1,
      name: "Aurelia Silk Slip Dress",
      slug: "aurelia-silk-slip-dress",
      sku: "NOC-0001",
      image_url: null,
      quantity: 2,
      unit_price: 14900,
      current_unit_price: 14900,
      line_total: 29800,
      available_quantity: 6,
      is_available: true,
      warnings: [],
    },
  ],
  coupon: { code: "WELCOME10", type: "percentage", value: 10, discount: 2980 },
  totals: { subtotal: 29800, discount: 2980, shipping: 0, tax: 0, total: 26820 },
};

describe("CartView", () => {
  it("renders lines, coupon and server totals", () => {
    render(
      <CartView
        cart={cart}
        onApplyCoupon={vi.fn()}
        onRemove={vi.fn()}
        onRemoveCoupon={vi.fn()}
        onUpdateQuantity={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Your cart" })).toBeInTheDocument();
    expect(screen.getByText("Aurelia Silk Slip Dress")).toBeInTheDocument();
    expect(screen.getByText("$298")).toBeInTheDocument();
    expect(screen.getByText("WELCOME10")).toBeInTheDocument();
    expect(screen.getByText("-$29.80")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("$268.20")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /checkout/i })).toHaveAttribute("href", "/checkout");
  });

  it("changes quantity and removes a line", () => {
    const onUpdateQuantity = vi.fn();
    const onRemove = vi.fn();

    render(
      <CartView
        cart={cart}
        onApplyCoupon={vi.fn()}
        onRemove={onRemove}
        onRemoveCoupon={vi.fn()}
        onUpdateQuantity={onUpdateQuantity}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Increase quantity of Aurelia Silk Slip Dress" }),
    );
    expect(onUpdateQuantity).toHaveBeenCalledWith(4, 3);

    fireEvent.click(screen.getByRole("button", { name: "Remove Aurelia Silk Slip Dress" }));
    expect(onRemove).toHaveBeenCalledWith(4);
  });

  it("applies and removes coupons", () => {
    const onApplyCoupon = vi.fn();
    const onRemoveCoupon = vi.fn();

    render(
      <CartView
        cart={{ ...cart, coupon: null, totals: { ...cart.totals, discount: 0, total: 29800 } }}
        onApplyCoupon={onApplyCoupon}
        onRemove={vi.fn()}
        onRemoveCoupon={onRemoveCoupon}
        onUpdateQuantity={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Coupon code"), { target: { value: " save20 " } });
    fireEvent.click(screen.getByRole("button", { name: "Apply coupon" }));
    expect(onApplyCoupon).toHaveBeenCalledWith("SAVE20");

    fireEvent.click(screen.getByRole("button", { name: "Remove coupon" }));
    expect(onRemoveCoupon).toHaveBeenCalled();
  });

  it("explains line warnings returned by the API", () => {
    render(
      <CartView
        cart={{
          ...cart,
          items: [{ ...cart.items[0]!, warnings: ["price_changed", "insufficient_stock"] }],
        }}
        onApplyCoupon={vi.fn()}
        onRemove={vi.fn()}
        onRemoveCoupon={vi.fn()}
        onUpdateQuantity={vi.fn()}
      />,
    );

    expect(screen.getByText("The price changed since you added this item.")).toBeInTheDocument();
    expect(screen.getByText("Fewer items are in stock than you requested.")).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(
      <CartView
        cart={{ ...cart, items: [], item_count: 0, coupon: null }}
        onApplyCoupon={vi.fn()}
        onRemove={vi.fn()}
        onRemoveCoupon={vi.fn()}
        onUpdateQuantity={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Your cart is empty" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue shopping" })).toHaveAttribute(
      "href",
      "/products",
    );
  });
});
