import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";
import { Modal } from "./modal";
import { Pagination } from "./pagination";
import { Skeleton } from "./skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

describe("shared UI", () => {
  it("renders an accessible input and marks invalid fields", () => {
    render(
      <>
        <label htmlFor="email">Email</label>
        <Input
          aria-describedby="email-error"
          aria-invalid
          id="email"
          placeholder="you@example.test"
        />
        <p id="email-error">Enter a valid email.</p>
      </>,
    );

    const input = screen.getByLabelText("Email");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
    expect(input).toHaveAttribute("data-slot", "input");
    expect(input).toHaveClass("border-destructive");
  });

  it("renders pagination links and marks the current page", () => {
    render(
      <Pagination
        currentPage={2}
        lastPage={3}
        buildHref={(page) => `/admin/orders?page=${page}`}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Pagination" });

    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/admin/orders?page=1",
    );
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/orders?page=3",
    );
    expect(screen.getByText("2")).toHaveAttribute("aria-current", "page");
  });

  it("renders a semantic table", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>ORD-2026-000001</TableCell>
            <TableCell>$50.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Order" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "$50.00" })).toBeInTheDocument();
  });

  it("renders a skeleton placeholder", () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse");
  });

  it("opens a modal and closes it", () => {
    const onOpenChange = vi.fn();

    render(
      <Modal
        description="This cannot be undone."
        onOpenChange={onOpenChange}
        open
        title="Delete coupon"
      >
        <p>Body</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete coupon")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
