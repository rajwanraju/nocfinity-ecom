import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const replace = vi.fn();
const refresh = vi.fn();
const state = vi.hoisted(() => ({ next: "/admin/orders?status=paid" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ next: state.next }),
}));

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  state.next = "/admin/orders?status=paid";
});

function submit(email = "admin@example.test", password = "Password123!") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it("posts credentials to the BFF and follows a safe next path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, message: "OK", data: {}, meta: null, errors: null }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LoginForm endpoint="/api/admin/auth/login" redirectTo="/admin" title="Admin sign in" />,
    );
    submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/orders?status=paid"));
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "admin@example.test", password: "Password123!" }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("shows the API message and field errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Invalid credentials.",
          data: null,
          meta: null,
          errors: { email: ["These credentials do not match our records."] },
        }),
        { status: 422, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm endpoint="/api/auth/login" redirectTo="/account" title="Sign in" />);
    submit("ada@example.test", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials.");
    expect(screen.getByText("These credentials do not match our records.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("asks for both fields before calling the API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm endpoint="/api/auth/login" redirectTo="/account" title="Sign in" />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("ignores an external next URL and uses the default destination", async () => {
    state.next = "https://evil.test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm endpoint="/api/auth/login" redirectTo="/account" title="Sign in" />);
    submit("ada@example.test", "Password123!");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account"));

    vi.unstubAllGlobals();
  });
});
