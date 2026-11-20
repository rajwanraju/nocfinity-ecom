import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProductSummary } from "@/lib/api/types";
import { AddToCartForm } from "./add-to-cart-form";
import { ProductCard } from "./product-card";
import { ProductGallery } from "./product-gallery";

const product: ProductSummary = {
  id: 1,
  name: "Aurelia Silk Slip Dress",
  slug: "aurelia-silk-slip-dress",
  sku: "NOC-0001",
  price: 18900,
  discount_price: 14900,
  current_price: 14900,
  has_discount: true,
  stock: 3,
  stock_status: "low_stock",
  is_active: true,
  category: {
    id: 2,
    parent_id: 1,
    name: "Dresses",
    slug: "dresses",
    description: null,
    image_url: null,
    is_active: true,
    sort_order: 0,
    children: [],
  },
  primary_image: {
    id: 1,
    path: "products/one.jpg",
    url: "http://127.0.0.1:8001/storage/products/one.jpg",
    alt: "Silk dress",
    is_primary: true,
    sort_order: 0,
  },
};

describe("ProductCard", () => {
  it("renders the discounted price, discount badge and stock warning", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByRole("link", { name: /Aurelia Silk Slip Dress/ })).toHaveAttribute(
      "href",
      "/products/aurelia-silk-slip-dress",
    );
    expect(screen.getByText("$149")).toBeInTheDocument();
    expect(screen.getByText("$189")).toHaveClass("line-through");
    expect(screen.getByText("-21%")).toBeInTheDocument();
    expect(screen.getByText("Only 3 left")).toBeInTheDocument();
    expect(screen.getByText("Dresses")).toBeInTheDocument();
  });

  it("marks out-of-stock products", () => {
    render(
      <ProductCard
        product={{ ...product, stock: 0, stock_status: "out_of_stock", has_discount: false }}
      />,
    );

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });
});

describe("AddToCartForm", () => {
  it("adds the selected quantity", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddToCartForm product={product} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByText("3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(1, 3));
  });

  it("cannot exceed available stock", () => {
    render(<AddToCartForm product={product} onAdd={vi.fn()} />);

    const increase = screen.getByRole("button", { name: "Increase quantity" });
    fireEvent.click(increase);
    fireEvent.click(increase);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(increase).toBeDisabled();
  });

  it("disables the action when the product is out of stock", () => {
    render(
      <AddToCartForm
        product={{ ...product, stock: 0, stock_status: "out_of_stock" }}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  });
});

describe("ProductGallery", () => {
  const images = [
    product.primary_image!,
    {
      id: 2,
      path: "products/two.jpg",
      url: "http://127.0.0.1:8001/storage/products/two.jpg",
      alt: "Back view",
      is_primary: false,
      sort_order: 1,
    },
  ];

  it("switches the main image when a thumbnail is chosen", () => {
    render(<ProductGallery images={images} name={product.name} />);

    fireEvent.click(screen.getByRole("button", { name: "Show image 2" }));

    expect(screen.getByRole("img", { name: "Back view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show image 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a placeholder when a product has no images", () => {
    render(<ProductGallery images={[]} name={product.name} />);

    expect(screen.getByText("No image available")).toBeInTheDocument();
  });
});
